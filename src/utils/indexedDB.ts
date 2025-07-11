import * as LZString from 'lz-string';
import type { ReportDraft, PhotoAttachment, SyncQueueItem, StorageStats, OfflineConfig, ExportData, StorageManager } from '@/types/offline';

export class IndexedDBManager implements StorageManager {
  private static instance: IndexedDBManager | null = null;
  private dbName = 'WorkOrderProDB';
  private version = 2;
  private db: IDBDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private defaultConfig: OfflineConfig = {
    maxDraftsPerWorkOrder: 5,
    maxTotalDrafts: 50,
    maxPhotoSizeBytes: 5 * 1024 * 1024, // 5MB
    maxTotalStorageBytes: 50 * 1024 * 1024, // 50MB
    autoSaveIntervalMs: 30000, // 30 seconds
    compressionQuality: 0.8,
    syncRetryIntervalMs: 60000, // 1 minute
    cleanupThresholdDays: 30,
  };

  // Singleton pattern
  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }

  async init(): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    if (this.db) {
      return Promise.resolve();
    }

    this.isInitializing = true;
    this.initPromise = this.performInit();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private performInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        // Safari fallback - try without version
        if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
          this.initSafariFallback().then(resolve).catch(reject);
        } else {
          reject(request.error);
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        
        // Add error handler for the database
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', event);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create drafts store
        if (!db.objectStoreNames.contains('drafts')) {
          const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
          draftsStore.createIndex('workOrderId', 'workOrderId', { unique: false });
          draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          draftsStore.createIndex('isManual', 'metadata.isManual', { unique: false });
        }

        // Create attachments store
        if (!db.objectStoreNames.contains('attachments')) {
          const attachmentsStore = db.createObjectStore('attachments', { keyPath: 'id' });
          attachmentsStore.createIndex('draftId', 'draftId', { unique: false });
          attachmentsStore.createIndex('size', 'size', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('nextAttempt', 'nextAttempt', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Safari fallback initialization
  private initSafariFallback(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create minimal schema for Safari
        if (!db.objectStoreNames.contains('drafts')) {
          const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
          draftsStore.createIndex('workOrderId', 'workOrderId', { unique: false });
        }
      };
    });
  }

  async saveDraft(draft: ReportDraft): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Compress photos before saving
    const compressedDraft = await this.compressDraft(draft);
    
    // Check storage limits
    await this.enforceStorageLimits();

    const transaction = this.db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');
    
    return new Promise((resolve, reject) => {
      const request = store.put(compressedDraft);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDraft(id: string): Promise<ReportDraft | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const draft = request.result;
        if (draft) {
          // Decompress photos
          resolve(this.decompressDraft(draft));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDraftsByWorkOrder(workOrderId: string): Promise<ReportDraft[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');
    const index = store.index('workOrderId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(workOrderId);
      request.onsuccess = () => {
        const drafts = request.result.map(draft => this.decompressDraft(draft));
        // Sort by updatedAt desc
        drafts.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(drafts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDraft(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

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
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageStats(): Promise<StorageStats> {
    if (!this.db) throw new Error('Database not initialized');

    const [drafts, syncQueue] = await Promise.all([
      this.getAllDrafts(),
      this.getSyncQueue()
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
    const estimatedQuota = this.defaultConfig.maxTotalStorageBytes;

    return {
      totalSpace: estimatedQuota,
      usedSpace: totalSize,
      availableSpace: estimatedQuota - totalSize,
      draftCount: drafts.length,
      photoCount,
      syncQueueSize: syncQueue.length,
    };
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
        version: this.version.toString(),
        deviceInfo: navigator.userAgent,
      },
    };
  }

  async importData(data: ExportData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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

  async cleanup(): Promise<void> {
    const config = this.defaultConfig;
    const cutoffTime = Date.now() - (config.cleanupThresholdDays * 24 * 60 * 60 * 1000);

    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['drafts', 'syncQueue'], 'readwrite');
    
    // Clean old drafts
    const draftsStore = transaction.objectStore('drafts');
    const draftsIndex = draftsStore.index('updatedAt');
    const draftsRequest = draftsIndex.openCursor();

    await new Promise<void>((resolve, reject) => {
      draftsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.updatedAt < cutoffTime && !cursor.value.metadata.isManual) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      draftsRequest.onerror = () => reject(draftsRequest.error);
    });

    // Clean old sync queue items
    const syncStore = transaction.objectStore('syncQueue');
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

    // Update cleanup timestamp
    await this.setMetadata('lastCleanup', Date.now());
  }

  private async getAllDrafts(): Promise<ReportDraft[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['drafts'], 'readonly');
    const store = transaction.objectStore('drafts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const drafts = request.result.map(draft => this.decompressDraft(draft));
        resolve(drafts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async compressDraft(draft: ReportDraft): Promise<ReportDraft> {
    const compressedDraft = { ...draft };
    
    compressedDraft.photos = await Promise.all(
      draft.photos.map(async (photo) => {
        if (photo.base64Data && !photo.compressedSize) {
          try {
            const compressed = LZString.compressToUTF16(photo.base64Data);
            if (compressed && compressed.length < photo.base64Data.length) {
              return {
                ...photo,
                base64Data: compressed,
                compressedSize: compressed.length * 2, // UTF-16 is 2 bytes per char
              };
            }
          } catch (error) {
            console.warn('Compression failed, using original data:', error);
          }
        }
        return photo;
      })
    );

    return compressedDraft;
  }

  private decompressDraft(draft: ReportDraft): ReportDraft {
    const decompressedDraft = { ...draft };
    
    decompressedDraft.photos = draft.photos.map((photo) => {
      if (photo.compressedSize) {
        try {
          const decompressed = LZString.decompressFromUTF16(photo.base64Data);
          return {
            ...photo,
            base64Data: decompressed || photo.base64Data,
          };
        } catch (error) {
          console.warn('Decompression failed, using original data:', error);
          return photo;
        }
      }
      return photo;
    });

    return decompressedDraft;
  }

  private async enforceStorageLimits(): Promise<void> {
    const stats = await this.getStorageStats();
    const config = this.defaultConfig;

    // If over storage limit, remove oldest auto-saved drafts
    if (stats.usedSpace > config.maxTotalStorageBytes || stats.draftCount > config.maxTotalDrafts) {
      const drafts = await this.getAllDrafts();
      
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
        if (stats.draftCount - removedCount <= config.maxTotalDrafts && 
            stats.usedSpace <= config.maxTotalStorageBytes) {
          break;
        }
        
        if (!draft.metadata.isManual) {
          await this.deleteDraft(draft.id);
          removedCount++;
        }
      }
    }
  }

  private async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBManager = IndexedDBManager.getInstance();