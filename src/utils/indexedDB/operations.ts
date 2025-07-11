import type { ReportDraft, SyncQueueItem, ExportData } from '@/types/offline';
import { compressDraft, decompressDraft } from './compression';

export class DatabaseOperations {
  constructor(private db: IDBDatabase) {}

  // Helper method to safely check if an index exists
  indexExists(store: IDBObjectStore, indexName: string): boolean {
    try {
      return store.indexNames.contains(indexName);
    } catch (error) {
      console.warn(`Error checking index ${indexName}:`, error);
      return false;
    }
  }

  // Helper method to safely access an index
  safeGetIndex(store: IDBObjectStore, indexName: string): IDBIndex | null {
    try {
      if (this.indexExists(store, indexName)) {
        return store.index(indexName);
      }
      console.warn(`Index ${indexName} not found in store ${store.name}`);
      return null;
    } catch (error) {
      console.error(`Error accessing index ${indexName}:`, error);
      return null;
    }
  }

  async saveDraft(draft: ReportDraft): Promise<void> {
    // Compress photos before saving
    const compressedDraft = await compressDraft(draft);

    const transaction = this.db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');
    
    return new Promise((resolve, reject) => {
      const request = store.put(compressedDraft);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDraft(id: string): Promise<ReportDraft | null> {
    const transaction = this.db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const draft = request.result;
        if (draft) {
          // Decompress photos
          resolve(decompressDraft(draft));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDraftsByWorkOrder(workOrderId: string): Promise<ReportDraft[]> {
    const transaction = this.db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');
    const index = this.safeGetIndex(store, 'workOrderId');

    if (!index) {
      // Fallback to full table scan if index doesn't exist
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const allDrafts = request.result
            .filter(draft => draft.workOrderId === workOrderId)
            .map(draft => decompressDraft(draft));
          allDrafts.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(allDrafts);
        };
        request.onerror = () => reject(request.error);
      });
    }

    return new Promise((resolve, reject) => {
      const request = index.getAll(workOrderId);
      request.onsuccess = () => {
        const drafts = request.result.map(draft => decompressDraft(draft));
        // Sort by updatedAt desc
        drafts.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(drafts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    const transaction = this.db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result;
        // Sort by priority desc, then by createdAt asc
        items.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDrafts(): Promise<ReportDraft[]> {
    const transaction = this.db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const drafts = request.result.map(draft => decompressDraft(draft));
        resolve(drafts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async exportData(): Promise<ExportData> {
    const [drafts, syncQueue] = await Promise.all([
      this.getAllDrafts(),
      this.getSyncQueue()
    ]);

    return {
      drafts,
      syncQueue,
      metadata: {
        exportedAt: Date.now(),
        version: this.db.version.toString(),
        deviceInfo: navigator.userAgent,
      },
    };
  }

  async importData(data: ExportData): Promise<void> {
    const transaction = this.db.transaction(['drafts', 'syncQueue'], 'readwrite');
    
    // Import drafts
    const draftsStore = transaction.objectStore('drafts');
    for (const draft of data.drafts) {
      await new Promise<void>((resolve, reject) => {
        const request = draftsStore.put(draft);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // Import sync queue
    const syncStore = transaction.objectStore('syncQueue');
    for (const item of data.syncQueue) {
      await new Promise<void>((resolve, reject) => {
        const request = syncStore.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async testBasicOperations(): Promise<void> {
    // Test read access to all stores
    const transaction = this.db.transaction(['drafts', 'attachments', 'syncQueue', 'metadata'], 'readonly');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('drafts').count();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('syncQueue').count();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }
}