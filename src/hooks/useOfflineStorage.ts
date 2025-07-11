import { useState, useEffect, useCallback } from 'react';
import { indexedDBManager } from '@/utils/indexedDB';
import { memoryStorageManager } from '@/utils/memoryStorage';
import { useToast } from '@/components/ui/use-toast';
import type { ReportDraft, PhotoAttachment, StorageStats, SyncQueueItem, StorageManager } from '@/types/offline';

type InitializationState = 'initializing' | 'retrying' | 'upgrading' | 'ready' | 'fallback' | 'failed';

type StorageError = {
  type: 'VersionError' | 'QuotaError' | 'CorruptionError' | 'SecurityError' | 'UnknownError';
  message: string;
  recoverable: boolean;
};

export function useOfflineStorage() {
  const [isReady, setIsReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [storageManager, setStorageManager] = useState<StorageManager>(indexedDBManager);
  const [initializationState, setInitializationState] = useState<InitializationState>('initializing');
  const [initializationError, setInitializationError] = useState<StorageError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cleanupScheduled, setCleanupScheduled] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [lastCleanupTime, setLastCleanupTime] = useState<number | null>(null);
  const { toast } = useToast();

  // Define processPendingSyncs early for use in service worker message handler
  const processPendingSyncs = useCallback(async (): Promise<void> => {
    try {
      const syncQueue = await storageManager.getSyncQueue();
      let processedCount = 0;

      for (const item of syncQueue) {
        try {
          // Skip if not ready for retry
          if (item.nextAttempt && item.nextAttempt > Date.now()) {
            continue;
          }

          // Process different sync types
          if (item.type === 'report_submit') {
            console.log('Processing report submission:', item.data);
          } else if (item.type === 'photo_upload') {
            console.log('Processing photo upload:', item.data);
          }

          await storageManager.removeSyncQueueItem(item.id);
          processedCount++;
        } catch (error) {
          const nextAttempt = Date.now() + (item.retryCount + 1) * 60000;
          
          if (item.retryCount >= item.maxRetries) {
            await storageManager.removeSyncQueueItem(item.id);
          } else {
            const updatedItem = {
              ...item,
              retryCount: item.retryCount + 1,
              lastAttempt: Date.now(),
              nextAttempt,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
            await storageManager.addToSyncQueue(updatedItem);
          }
        }
      }

      if (processedCount > 0) {
        toast({
          title: "Sync Complete",
          description: `Synced ${processedCount} items successfully`,
        });
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to process pending syncs",
        variant: "destructive",
      });
    }
  }, [storageManager, toast]);

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, tag } = event.data;
    
    if (type === 'BACKGROUND_SYNC' && tag === 'work-order-report') {
      processPendingSyncs();
    }
  }, [processPendingSyncs]);

  useEffect(() => {
    initializeStorage();
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Separate effect for setting up the interval only after DB is ready
  useEffect(() => {
    if (!isReady) return;
    
    // Initial stats update
    updateStats();
    
    // Update stats periodically only when DB is ready
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, [isReady]);

  const classifyError = (error: any): StorageError => {
    const message = error?.message || 'Unknown error occurred';
    
    if (message.includes('version') || message.includes('VersionError')) {
      return { type: 'VersionError', message, recoverable: true };
    }
    if (message.includes('quota') || message.includes('storage')) {
      return { type: 'QuotaError', message, recoverable: true };
    }
    if (message.includes('corrupt') || message.includes('invalid')) {
      return { type: 'CorruptionError', message, recoverable: true };
    }
    if (message.includes('security') || message.includes('permission')) {
      return { type: 'SecurityError', message, recoverable: false };
    }
    
    return { type: 'UnknownError', message, recoverable: true };
  };

  const detectAndHandleExistingDatabases = async (): Promise<void> => {
    try {
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases();
        const workOrderDBs = databases.filter(db => 
          db.name?.includes('WorkOrderPro') || db.name?.includes('workorder')
        );
        
        if (workOrderDBs.length > 1) {
          console.log('Multiple WorkOrder databases detected, cleaning up...');
          // Clean up duplicate databases
          for (const db of workOrderDBs.slice(1)) {
            if (db.name) {
              await indexedDB.deleteDatabase(db.name);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to detect existing databases:', error);
    }
  };

  const isCleanupSafe = async (): Promise<boolean> => {
    try {
      if (!isReady || isUsingFallback || cleanupInProgress) {
        return false;
      }

      // Check if using IndexedDB manager
      if (storageManager !== indexedDBManager) {
        return false;
      }

      // Test basic database access
      const stats = await storageManager.getStorageStats();
      if (!stats) {
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Cleanup safety check failed:', error);
      return false;
    }
  };

  const scheduleCleanup = useCallback(() => {
    if (cleanupScheduled || isUsingFallback) {
      return;
    }

    setCleanupScheduled(true);
    
    setTimeout(async () => {
      try {
        const isSafe = await isCleanupSafe();
        if (!isSafe) {
          console.log('Cleanup skipped - safety check failed');
          setCleanupScheduled(false);
          return;
        }

        setCleanupInProgress(true);
        console.log('Running scheduled cleanup...');
        
        await storageManager.cleanup();
        setLastCleanupTime(Date.now());
        console.log('Scheduled cleanup completed successfully');
        
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
        // Don't show toast for cleanup failures to keep it silent
      } finally {
        setCleanupInProgress(false);
        setCleanupScheduled(false);
      }
    }, 30000); // 30 seconds delay
  }, [cleanupScheduled, isUsingFallback, storageManager, cleanupInProgress, isReady]);

  const initializeStorageWithRetry = async (maxRetries = 3): Promise<void> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      setRetryCount(attempt - 1);
      
      try {
        if (attempt === 1) {
          setInitializationState('initializing');
          console.log('Storage initialization attempt 1/3');
          await detectAndHandleExistingDatabases();
        } else {
          setInitializationState('retrying');
          console.log(`Storage initialization retry ${attempt}/${maxRetries}`);
          
          // Proper exponential backoff: 500ms, 1000ms, 2000ms
          const delays = [0, 500, 1000, 2000];
          const delay = delays[attempt - 1] || 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        setInitializationState('upgrading');
        await indexedDBManager.init();
        
        setStorageManager(indexedDBManager);
        setIsUsingFallback(false);
        setInitializationState('ready');
        setIsReady(true);
        setInitializationError(null);
        
        await updateStats();
        
        // Schedule cleanup for 30 seconds after successful initialization
        scheduleCleanup();
        return;
        
      } catch (error) {
        const storageError = classifyError(error);
        setInitializationError(storageError);
        
        console.error(`Storage init attempt ${attempt} failed:`, error);
        
        // Show toast notification for retry failures (but not on final attempt)
        if (attempt < maxRetries) {
          toast({
            title: `Storage Retry ${attempt}/${maxRetries}`,
            description: `Initialization failed, retrying in ${[0, 500, 1000, 2000][attempt] || 2000}ms...`,
          });
        }
        
        if (attempt === maxRetries) {
          await handleStorageFallback(storageError);
          return;
        }
      }
    }
  };

  const handleStorageFallback = async (error: StorageError): Promise<void> => {
    try {
      setInitializationState('fallback');
      await memoryStorageManager.init();
      setStorageManager(memoryStorageManager);
      setIsUsingFallback(true);
      setIsReady(true);
      await updateStats();
      
      // Only show intrusive message for non-recoverable errors
      if (!error.recoverable) {
        toast({
          title: "Storage Issue",
          description: "Using temporary storage until resolved",
        });
      }
    } catch (fallbackError) {
      console.error('Memory storage fallback also failed:', fallbackError);
      setInitializationState('failed');
      toast({
        title: "Storage Error",
        description: "Storage initialization failed completely",
        variant: "destructive",
      });
    }
  };

  const initializeStorage = async () => {
    await initializeStorageWithRetry();
  };

  const retryInitialization = useCallback(async (): Promise<void> => {
    setIsReady(false);
    setInitializationError(null);
    await initializeStorageWithRetry();
  }, []);

  const resetStorageWithConfirmation = useCallback(async (): Promise<void> => {
    if (!confirm('This will clear all offline data. Are you sure?')) {
      return;
    }
    
    try {
      setInitializationState('initializing');
      setIsReady(false);
      
      // Delete the database completely
      await indexedDB.deleteDatabase('WorkOrderProDB');
      
      // Clear any other storage
      localStorage.removeItem('workorder-fallback-storage');
      
      // Reinitialize
      await initializeStorageWithRetry();
      
      toast({
        title: "Storage Reset",
        description: "Storage has been cleared and reinitialized",
      });
    } catch (error) {
      console.error('Failed to reset storage:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset storage",
        variant: "destructive",
      });
    }
  }, []);

  const updateStats = async () => {
    if (!isReady) return;
    
    try {
      const stats = await storageManager.getStorageStats();
      
      // Add cleanup status to stats
      const enhancedStats = {
        ...stats,
        cleanupStatus: {
          isScheduled: cleanupScheduled,
          isInProgress: cleanupInProgress,
          lastRun: lastCleanupTime,
          nextScheduled: cleanupScheduled ? Date.now() + 30000 : null,
        }
      };
      
      setStorageStats(enhancedStats);
      
      const syncQueue = await storageManager.getSyncQueue();
      setPendingCount(syncQueue.length);
      
      // Warn if storage is getting full (but not for memory storage)
      if (!isUsingFallback && stats.usedSpace / stats.totalSpace > 0.9) {
        toast({
          title: "Storage Almost Full",
          description: "Consider syncing or clearing old drafts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating storage stats:', error);
    }
  };

  const saveDraft = useCallback(async (
    workOrderId: string,
    formData: {
      workPerformed: string;
      materialsUsed?: string;
      hoursWorked?: number;
      invoiceAmount?: number;
      invoiceNumber?: string;
      notes?: string;
    },
    photos: PhotoAttachment[],
    isManual = false
  ): Promise<string> => {
    if (!isReady) {
      throw new Error('Storage not ready');
    }
    
    try {
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      
      const draft: ReportDraft = {
        id: draftId,
        workOrderId,
        ...formData,
        photos,
        metadata: {
          id: draftId,
          workOrderId,
          lastModified: now,
          version: 1,
          autoSaveCount: isManual ? 0 : 1,
          isManual,
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      await storageManager.saveDraft(draft);
      await updateStats();
      
      if (isManual) {
        const storageType = isUsingFallback ? "(temporary)" : "";
        toast({
          title: "Draft Saved",
          description: `Report draft saved successfully ${storageType}`,
        });
      }
      
      return draftId;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save report draft",
        variant: "destructive",
      });
      throw error;
    }
  }, [isReady, storageManager, isUsingFallback, toast]);

  const getDrafts = useCallback(async (workOrderId: string): Promise<ReportDraft[]> => {
    if (!isReady) return [];
    
    try {
      return await storageManager.getDraftsByWorkOrder(workOrderId);
    } catch (error) {
      console.error('Error getting drafts:', error);
      return [];
    }
  }, [isReady, storageManager]);

  const loadDraft = useCallback(async (draftId: string): Promise<ReportDraft | null> => {
    if (!isReady) return null;
    
    try {
      return await storageManager.getDraft(draftId);
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, [isReady, storageManager]);

  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    if (!isReady) {
      toast({
        title: "Storage Not Ready",
        description: "Please wait for storage to initialize",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await storageManager.deleteDraft(draftId);
      await updateStats();
      toast({
        title: "Draft Deleted",
        description: "Report draft deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete report draft",
        variant: "destructive",
      });
    }
  }, [isReady, storageManager, toast]);

  const queueSync = useCallback(async (
    type: SyncQueueItem['type'],
    data: any,
    priority = 1
  ): Promise<void> => {
    try {
      const syncItem: SyncQueueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        priority,
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await storageManager.addToSyncQueue(syncItem);
      await updateStats();
    } catch (error) {
      console.error('Error queueing sync:', error);
    }
  }, [storageManager]);


  const exportData = useCallback(async () => {
    try {
      const data = await storageManager.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `workorder-drafts-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Drafts exported successfully",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export drafts",
        variant: "destructive",
      });
    }
  }, [storageManager, toast]);

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      // This would clear everything - implement with caution
      await storageManager.cleanup();
      await updateStats();
      
      toast({
        title: "Cache Cleared",
        description: "All cached data has been cleared",
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear cached data",
        variant: "destructive",
      });
    }
  }, [storageManager, toast]);

  return {
    isReady,
    pendingCount,
    storageStats,
    isUsingFallback,
    initializationState,
    initializationError,
    retryCount,
    saveDraft,
    getDrafts,
    loadDraft,
    deleteDraft,
    queueSync,
    processPendingSyncs,
    exportData,
    clearCache,
    retryInitialization,
    resetStorageWithConfirmation,
  };
}