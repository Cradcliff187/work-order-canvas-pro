import { useState, useCallback } from 'react';
import type { StorageManager } from '@/types/offline';

export function useStorageCleanup(
  storageManager: StorageManager,
  isReady: boolean,
  isUsingFallback: boolean
) {
  const [cleanupScheduled, setCleanupScheduled] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [lastCleanupTime, setLastCleanupTime] = useState<number | null>(null);

  const isCleanupSafe = async (): Promise<boolean> => {
    try {
      if (!isReady || isUsingFallback || cleanupInProgress) {
        return false;
      }

      // Test basic database access
      const stats = await storageManager.getStorageStats();
      if (!stats) {
        return false;
      }

      // Check database version compatibility
      if ('actualVersion' in storageManager && 'expectedVersion' in storageManager) {
        const manager = storageManager as any;
        if (manager.actualVersion !== manager.expectedVersion) {
          console.warn('Cleanup skipped - database version mismatch');
          return false;
        }
      }

      // Verify database is at expected version (v3)
      if ('db' in storageManager) {
        const manager = storageManager as any;
        const db = manager.db;
        if (db && db.version !== 3) {
          console.warn('Cleanup skipped - database not at version 3');
          return false;
        }

        // Verify required indexes exist
        if (db && db.objectStoreNames.contains('drafts')) {
          const transaction = db.transaction(['drafts'], 'readonly');
          const draftsStore = transaction.objectStore('drafts');
          
          const requiredIndexes = ['workOrderId', 'updatedAt', 'isManual'];
          for (const indexName of requiredIndexes) {
            if (!draftsStore.indexNames.contains(indexName)) {
              console.warn(`Cleanup skipped - missing index: ${indexName}`);
              return false;
            }
          }
        }

        // Verify sync queue store exists
        if (db && db.objectStoreNames.contains('syncQueue')) {
          const transaction = db.transaction(['syncQueue'], 'readonly');
          const syncStore = transaction.objectStore('syncQueue');
          
          const requiredSyncIndexes = ['type', 'priority', 'nextAttempt'];
          for (const indexName of requiredSyncIndexes) {
            if (!syncStore.indexNames.contains(indexName)) {
              console.warn(`Cleanup skipped - missing sync index: ${indexName}`);
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.warn('Cleanup safety check failed:', error);
      return false;
    }
  };

  const scheduleCleanup = useCallback(() => {
    if (cleanupScheduled || isUsingFallback || !isReady) {
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
      } finally {
        setCleanupInProgress(false);
        setCleanupScheduled(false);
      }
    }, 30000); // 30 seconds delay
  }, [cleanupScheduled, isUsingFallback, isReady]); // Remove storageManager dependency

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await storageManager.cleanup();
      
      // toast notification would be handled by parent component
      return Promise.resolve();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }, [storageManager]);

  const getCleanupStatus = () => ({
    isScheduled: cleanupScheduled,
    isInProgress: cleanupInProgress,
    lastRun: lastCleanupTime,
    nextScheduled: cleanupScheduled ? Date.now() + 30000 : null,
    isSafe: isReady && !isUsingFallback && !cleanupInProgress,
  });

  return {
    cleanupScheduled,
    cleanupInProgress,
    lastCleanupTime,
    scheduleCleanup,
    clearCache,
    getCleanupStatus,
  };
}