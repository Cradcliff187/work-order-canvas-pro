import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { StorageManager, SyncQueueItem } from '@/types/offline';

export function useSyncOperations(storageManager: StorageManager) {
  const { toast } = useToast();

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

  return {
    queueSync,
    processPendingSyncs,
  };
}