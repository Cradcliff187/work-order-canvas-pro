import type { StorageStats, OfflineConfig } from '@/types/offline';
import { DatabaseOperations } from './operations';

export class DatabaseCleanup {
  constructor(
    private db: IDBDatabase | null,
    private expectedVersion: number,
    private config: OfflineConfig,
    private operations: DatabaseOperations | null
  ) {}

  async getStorageStats(): Promise<StorageStats> {
    if (!this.db || !this.operations) throw new Error('Database not initialized');

    const [drafts, syncQueue] = await Promise.all([
      this.operations.getAllDrafts(),
      this.operations.getSyncQueue()
    ]);

    let totalSize = 0;
    let photoCount = 0;

    for (const draft of drafts) {
      for (const photo of draft.photos) {
        totalSize += photo.compressedSize || photo.size;
        photoCount++;
      }
    }

    // Estimate available space (IndexedDB doesn't provide exact quotas)
    const estimatedQuota = this.config.maxTotalStorageBytes;

    return {
      totalSpace: estimatedQuota,
      usedSpace: totalSize,
      availableSpace: estimatedQuota - totalSize,
      draftCount: drafts.length,
      photoCount,
      syncQueueSize: syncQueue.length,
    };
  }

  async cleanup(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.cleanupThresholdDays * 24 * 60 * 60 * 1000);

    if (!this.db || !this.operations) throw new Error('Database not initialized');

    // Verify database version before cleanup
    if (this.db.version !== this.expectedVersion) {
      console.warn('Cleanup aborted - database version mismatch');
      return;
    }

    if (this.db.version !== 3) {
      console.warn('Cleanup aborted - database not at version 3');
      return;
    }

    // Verify required stores exist
    if (!this.db.objectStoreNames.contains('drafts') || !this.db.objectStoreNames.contains('syncQueue')) {
      console.warn('Cleanup aborted - required stores missing');
      return;
    }

    const transaction = this.db.transaction(['drafts', 'syncQueue'], 'readwrite');
    
    // Clean old drafts using safe index access
    const draftsStore = transaction.objectStore('drafts');
    const draftsIndex = this.operations.safeGetIndex(draftsStore, 'updatedAt');

    if (draftsIndex) {
      // Use index if available
      const draftsRequest = draftsIndex.openCursor();
      await new Promise<void>((resolve, reject) => {
        draftsRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (cursor.value.updatedAt < cutoffTime && !cursor.value.metadata?.isManual) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        draftsRequest.onerror = () => reject(draftsRequest.error);
      });
    } else {
      // Fallback to full table scan
      const draftsRequest = draftsStore.openCursor();
      await new Promise<void>((resolve, reject) => {
        draftsRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (cursor.value.updatedAt < cutoffTime && !cursor.value.metadata?.isManual) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        draftsRequest.onerror = () => reject(draftsRequest.error);
      });
    }

    // Clean old sync queue items with safe index access
    const syncStore = transaction.objectStore('syncQueue');
    
    // Check if we can use indexes for better performance
    const typeIndex = this.operations.safeGetIndex(syncStore, 'type');
    if (typeIndex) {
      // Use index if available
      const syncRequest = syncStore.openCursor();
      await new Promise<void>((resolve, reject) => {
        syncRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (cursor.value.createdAt < cutoffTime && cursor.value.retryCount >= cursor.value.maxRetries) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        syncRequest.onerror = () => reject(syncRequest.error);
      });
    } else {
      // Fallback to full table scan if indexes are missing
      const syncRequest = syncStore.openCursor();
      await new Promise<void>((resolve, reject) => {
        syncRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (cursor.value.createdAt < cutoffTime && cursor.value.retryCount >= cursor.value.maxRetries) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        syncRequest.onerror = () => reject(syncRequest.error);
      });
    }

    // Update cleanup timestamp
    try {
      await this.operations.setMetadata('lastCleanup', Date.now());
    } catch (error) {
      console.warn('Failed to update cleanup timestamp:', error);
    }
  }

  async enforceStorageLimits(): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');

    const stats = await this.getStorageStats();

    // If over storage limit, remove oldest auto-saved drafts
    if (stats.usedSpace > this.config.maxTotalStorageBytes || stats.draftCount > this.config.maxTotalDrafts) {
      const drafts = await this.operations.getAllDrafts();
      
      // Sort by manual flag (manual drafts last), then by updatedAt (oldest first)
      const sortedDrafts = drafts.sort((a, b) => {
        if (a.metadata.isManual !== b.metadata.isManual) {
          return a.metadata.isManual ? 1 : -1;
        }
        return a.updatedAt - b.updatedAt;
      });

      // Remove drafts until under limits
      let removedCount = 0;
      for (const draft of sortedDrafts) {
        if (stats.draftCount - removedCount <= this.config.maxTotalDrafts && 
            stats.usedSpace <= this.config.maxTotalStorageBytes) {
          break;
        }
        
        if (!draft.metadata.isManual) {
          await this.operations.deleteDraft(draft.id);
          removedCount++;
        }
      }
    }
  }
}