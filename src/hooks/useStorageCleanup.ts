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
      } finally {
        setCleanupInProgress(false);
        setCleanupScheduled(false);
      }
    }, 30000); // 30 seconds delay
  }, [cleanupScheduled, isUsingFallback, storageManager, cleanupInProgress, isReady]);

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