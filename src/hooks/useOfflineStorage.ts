import { useState, useEffect, useCallback } from 'react';
import { indexedDBManager } from '@/utils/indexedDB';
import { memoryStorageManager } from '@/utils/memoryStorage';
import { useToast } from '@/components/ui/use-toast';
import type { ReportDraft, PhotoAttachment, StorageStats, SyncQueueItem, StorageManager } from '@/types/offline';

export function useOfflineStorage() {
  const [isReady, setIsReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [storageManager, setStorageManager] = useState<StorageManager>(indexedDBManager);
  const { toast } = useToast();

  useEffect(() => {
    initializeStorage();
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

  const initializeStorage = async () => {
    try {
      await indexedDBManager.init();
      setStorageManager(indexedDBManager);
      setIsUsingFallback(false);
      setIsReady(true);
      await updateStats();
      
      // Run cleanup on startup
      await indexedDBManager.cleanup();
    } catch (error) {
      console.error('IndexedDB initialization failed, falling back to memory storage:', error);
      
      // Fallback to memory storage
      try {
        await memoryStorageManager.init();
        setStorageManager(memoryStorageManager);
        setIsUsingFallback(true);
        setIsReady(true);
        await updateStats();
        
        toast({
          title: "Storage Fallback",
          description: "Using temporary storage - data won't persist after page reload",
          variant: "destructive",
        });
      } catch (fallbackError) {
        console.error('Memory storage fallback also failed:', fallbackError);
        toast({
          title: "Storage Error",
          description: "Failed to initialize any storage system",
          variant: "destructive",
        });
      }
    }
  };

  const updateStats = async () => {
    if (!isReady) return;
    
    try {
      const stats = await storageManager.getStorageStats();
      setStorageStats(stats);
      
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
            // Implementation would call your report submission API
            console.log('Processing report submission:', item.data);
          } else if (item.type === 'photo_upload') {
            // Implementation would call your photo upload API
            console.log('Processing photo upload:', item.data);
          }

          // Remove from queue on success
          await storageManager.removeSyncQueueItem(item.id);
          processedCount++;
        } catch (error) {
          // Update retry count and schedule next attempt
          const nextAttempt = Date.now() + (item.retryCount + 1) * 60000; // Exponential backoff
          
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

      await updateStats();
      
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
    saveDraft,
    getDrafts,
    loadDraft,
    deleteDraft,
    queueSync,
    processPendingSyncs,
    exportData,
    clearCache,
  };
}