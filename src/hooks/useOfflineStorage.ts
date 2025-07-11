import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStorageInitialization } from './useStorageInitialization';
import { useStorageCleanup } from './useStorageCleanup';
import { useDraftManagement } from './useDraftManagement';
import { useSyncOperations } from './useSyncOperations';
import type { StorageStats, PhotoAttachment, StorageState } from '@/types/offline';

export function useOfflineStorage() {
  const [isReady, setIsReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [storageState, setStorageState] = useState<StorageState>({
    isReady: false,
    isInitializing: false,
    isCleanupRunning: false,
    isUsingFallback: false,
    pendingCount: 0,
    initializationError: null,
    retryCount: 0,
  });
  const { toast } = useToast();

  // Initialize storage
  const {
    storageManager,
    initializationState,
    initializationError,
    retryCount,
    isUsingFallback,
    initializeStorageWithRetry,
    retryInitialization,
    resetStorageWithConfirmation,
  } = useStorageInitialization();

  // Cleanup operations
  const {
    cleanupScheduled,
    cleanupInProgress,
    lastCleanupTime,
    scheduleCleanup,
    clearCache,
    getCleanupStatus,
  } = useStorageCleanup(storageManager, isReady, isUsingFallback);

  // Draft management
  const {
    saveDraft,
    getDrafts,
    loadDraft,
    deleteDraft,
    exportData,
  } = useDraftManagement(storageManager, isReady, isUsingFallback);

  // Sync operations
  const {
    queueSync,
    processPendingSyncs,
  } = useSyncOperations(storageManager);

  // Initialize storage on mount - run once only
  useEffect(() => {
    let isCancelled = false;
    
    const initializeStorage = async () => {
      if (isCancelled) return;
      
      await initializeStorageWithRetry();
      
      if (isCancelled) return;
      
      // Schedule cleanup after successful initialization
      if (initializationState === 'ready') {
        scheduleCleanup();
      }
    };

    initializeStorage();

    return () => {
      isCancelled = true;
    };
  }, [initializeStorageWithRetry]); // Only depend on the function, not state

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, tag } = event.data;
      
      if (type === 'BACKGROUND_SYNC' && tag === 'work-order-report') {
        processPendingSyncs();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [processPendingSyncs]);

  // Update ready state when initialization completes
  useEffect(() => {
    const ready = initializationState === 'ready' || initializationState === 'fallback';
    setIsReady(ready);
    
    // Update comprehensive storage state
    setStorageState(prev => ({
      ...prev,
      isReady: ready,
      isInitializing: initializationState === 'initializing' || initializationState === 'retrying' || initializationState === 'upgrading',
      isCleanupRunning: cleanupInProgress,
      isUsingFallback,
      pendingCount,
      initializationError: initializationError ? {
        ...initializationError,
        timestamp: Date.now(),
      } : null,
      retryCount,
    }));
  }, [initializationState, cleanupInProgress, isUsingFallback, pendingCount, initializationError, retryCount]);

  // Update stats periodically when ready
  useEffect(() => {
    if (!isReady) return;
    
    const updateStats = async () => {
      try {
        const stats = await storageManager.getStorageStats();
        
        // Add cleanup status to stats
        const enhancedStats = {
          ...stats,
          cleanupStatus: getCleanupStatus(),
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

    // Initial stats update
    updateStats();
    
    // Update stats periodically
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, [isReady, storageManager, getCleanupStatus, isUsingFallback, toast]);

  // Enhanced clear cache with toast notifications
  const clearCacheWithToast = useCallback(async (): Promise<void> => {
    try {
      await clearCache();
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
  }, [clearCache, toast]);

  return {
    // State
    isReady,
    pendingCount,
    storageStats,
    storageState,
    isUsingFallback,
    initializationState,
    initializationError,
    retryCount,
    
    // Draft operations
    saveDraft,
    getDrafts,
    loadDraft,
    deleteDraft,
    
    // Sync operations
    queueSync,
    processPendingSyncs,
    
    // Utility operations
    exportData,
    clearCache: clearCacheWithToast,
    retryInitialization,
    resetStorageWithConfirmation,
    
    // Debug operations (development only)
    storageManager,
  };
}