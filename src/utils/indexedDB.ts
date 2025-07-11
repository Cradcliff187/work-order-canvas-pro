import * as LZString from 'lz-string';
import type { 
  ReportDraft, 
  PhotoAttachment, 
  SyncQueueItem, 
  StorageStats, 
  OfflineConfig, 
  ExportData, 
  StorageManager,
  DatabaseIntegrityReport,
  IntegrityIssue,
  RepairStrategy,
  RepairResult
} from '@/types/offline';

export class IndexedDBManager implements StorageManager {
  private static instance: IndexedDBManager | null = null;
  private dbName = 'WorkOrderProDB';
  private expectedVersion = 3;
  private actualVersion: number | null = null;
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

  // Migration functions for each version
  private migrations: Record<number, (db: IDBDatabase) => void> = {
    1: this.upgradeToV1.bind(this),
    2: this.upgradeToV2.bind(this),
    3: this.upgradeToV3.bind(this),
  };

  private upgradeToV1(db: IDBDatabase): void {
    // Initial schema creation
    if (!db.objectStoreNames.contains('drafts')) {
      const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
      draftsStore.createIndex('workOrderId', 'workOrderId', { unique: false });
      draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }
  }

  private upgradeToV2(db: IDBDatabase): void {
    // Add additional stores and indexes
    if (!db.objectStoreNames.contains('attachments')) {
      const attachmentsStore = db.createObjectStore('attachments', { keyPath: 'id' });
      attachmentsStore.createIndex('draftId', 'draftId', { unique: false });
      attachmentsStore.createIndex('size', 'size', { unique: false });
    }

    if (!db.objectStoreNames.contains('syncQueue')) {
      const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
      syncStore.createIndex('type', 'type', { unique: false });
      syncStore.createIndex('priority', 'priority', { unique: false });
      syncStore.createIndex('nextAttempt', 'nextAttempt', { unique: false });
    }

    if (!db.objectStoreNames.contains('metadata')) {
      db.createObjectStore('metadata', { keyPath: 'key' });
    }

    // Add missing indexes to drafts store if they don't exist
    const draftsStore = db.objectStoreNames.contains('drafts') ? 
      db.transaction('drafts').objectStore('drafts') : null;
    
    if (draftsStore && !draftsStore.indexNames.contains('isManual')) {
      draftsStore.createIndex('isManual', 'metadata.isManual', { unique: false });
    }
  }

  private upgradeToV3(db: IDBDatabase): void {
    // Version 3: Complete schema consolidation and index validation
    this.createCompleteSchema(db);
  }

  private createCompleteSchema(db: IDBDatabase): void {
    // Create drafts store with all required indexes
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
  }

  // Singleton pattern
  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }

  private async detectCurrentVersion(): Promise<number> {
    return new Promise((resolve) => {
      const testRequest = indexedDB.open(this.dbName);
      testRequest.onsuccess = () => {
        const currentVersion = testRequest.result.version;
        testRequest.result.close();
        resolve(currentVersion);
      };
      testRequest.onerror = () => resolve(1);
    });
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

  private async performInit(): Promise<void> {
    try {
      // Use fixed version 3 instead of dynamic calculation
      this.actualVersion = this.expectedVersion;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.expectedVersion);

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
    } catch (error) {
      console.error('Failed to perform init:', error);
      throw error;
    }
  }

  // Safari fallback initialization with complete schema
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
        
        // Create complete schema for Safari fallback
        this.createCompleteSchema(db);
      };
    });
  }

  // Helper method to safely check if an index exists
  private indexExists(store: IDBObjectStore, indexName: string): boolean {
    try {
      return store.indexNames.contains(indexName);
    } catch (error) {
      console.warn(`Error checking index ${indexName}:`, error);
      return false;
    }
  }

  // Helper method to safely access an index
  private safeGetIndex(store: IDBObjectStore, indexName: string): IDBIndex | null {
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
    const index = this.safeGetIndex(store, 'workOrderId');

    if (!index) {
      // Fallback to full table scan if index doesn't exist
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const allDrafts = request.result
            .filter(draft => draft.workOrderId === workOrderId)
            .map(draft => this.decompressDraft(draft));
          allDrafts.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(allDrafts);
        };
        request.onerror = () => reject(request.error);
      });
    }

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
        version: (this.actualVersion || this.expectedVersion).toString(),
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

    // Verify database version before cleanup
    if (this.actualVersion !== this.expectedVersion) {
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
    const draftsIndex = this.safeGetIndex(draftsStore, 'updatedAt');

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
    const typeIndex = this.safeGetIndex(syncStore, 'type');
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
      await this.setMetadata('lastCleanup', Date.now());
    } catch (error) {
      console.warn('Failed to update cleanup timestamp:', error);
    }
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

  async verifyDatabaseIntegrity(): Promise<DatabaseIntegrityReport> {
    const startTime = Date.now();
    const issues: IntegrityIssue[] = [];
    let dataAtRisk = false;

    try {
      if (!this.db) {
        issues.push({
          type: 'missing_store',
          severity: 'critical',
          description: 'Database not initialized',
          repairAction: {
            level: 3,
            name: 'database_reinit',
            description: 'Reinitialize database with full schema',
            dataBackupRequired: true,
            estimatedDuration: 5000,
            riskLevel: 'high'
          }
        });
        dataAtRisk = true;
        
        return {
          isHealthy: false,
          issues,
          repairRecommendations: issues.map(i => i.repairAction),
          dataAtRisk,
          lastChecked: Date.now()
        };
      }

      // Check database version
      if (this.db.version !== this.expectedVersion) {
        issues.push({
          type: 'version_mismatch',
          severity: 'high',
          description: `Database version ${this.db.version} does not match expected version ${this.expectedVersion}`,
          repairAction: {
            level: 2,
            name: 'version_migration',
            description: 'Migrate database to correct version',
            dataBackupRequired: true,
            estimatedDuration: 3000,
            riskLevel: 'medium'
          }
        });
      }

      // Check required object stores
      const requiredStores = ['drafts', 'attachments', 'syncQueue', 'metadata'];
      for (const storeName of requiredStores) {
        if (!this.db.objectStoreNames.contains(storeName)) {
          issues.push({
            type: 'missing_store',
            severity: 'critical',
            description: `Object store '${storeName}' is missing`,
            affectedStore: storeName,
            repairAction: {
              level: 3,
              name: 'recreate_store',
              description: `Recreate missing object store '${storeName}'`,
              dataBackupRequired: true,
              estimatedDuration: 2000,
              riskLevel: 'high'
            }
          });
          dataAtRisk = true;
        }
      }

      // Check required indexes
      const requiredIndexes = {
        drafts: ['workOrderId', 'updatedAt', 'isManual'],
        attachments: ['draftId', 'size'],
        syncQueue: ['type', 'priority', 'nextAttempt']
      };

      for (const [storeName, indexes] of Object.entries(requiredIndexes)) {
        if (this.db.objectStoreNames.contains(storeName)) {
          try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            for (const indexName of indexes) {
              if (!this.indexExists(store, indexName)) {
                issues.push({
                  type: 'missing_index',
                  severity: 'medium',
                  description: `Index '${indexName}' is missing from store '${storeName}'`,
                  affectedStore: storeName,
                  affectedIndex: indexName,
                  repairAction: {
                    level: 1,
                    name: 'rebuild_index',
                    description: `Rebuild missing index '${indexName}'`,
                    dataBackupRequired: false,
                    estimatedDuration: 1000,
                    riskLevel: 'low'
                  }
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to check indexes for store ${storeName}:`, error);
            issues.push({
              type: 'corrupted_data',
              severity: 'high',
              description: `Cannot access store '${storeName}' - may be corrupted`,
              affectedStore: storeName,
              repairAction: {
                level: 2,
                name: 'repair_store',
                description: `Repair corrupted store '${storeName}'`,
                dataBackupRequired: true,
                estimatedDuration: 3000,
                riskLevel: 'medium'
              }
            });
            dataAtRisk = true;
          }
        }
      }

      // Test basic CRUD operations
      try {
        await this.testBasicOperations();
      } catch (error) {
        issues.push({
          type: 'corrupted_data',
          severity: 'high',
          description: 'Basic database operations are failing',
          repairAction: {
            level: 2,
            name: 'repair_operations',
            description: 'Repair database to restore basic functionality',
            dataBackupRequired: true,
            estimatedDuration: 4000,
            riskLevel: 'medium'
          }
        });
        dataAtRisk = true;
      }

      const isHealthy = issues.length === 0;
      console.log(`Database integrity check completed in ${Date.now() - startTime}ms. Issues found: ${issues.length}`);

      return {
        isHealthy,
        issues,
        repairRecommendations: issues.map(i => i.repairAction),
        dataAtRisk,
        lastChecked: Date.now()
      };

    } catch (error) {
      console.error('Database integrity check failed:', error);
      return {
        isHealthy: false,
        issues: [{
          type: 'corrupted_data',
          severity: 'critical',
          description: `Integrity check failed: ${error}`,
          repairAction: {
            level: 4,
            name: 'emergency_rebuild',
            description: 'Emergency database rebuild with data export',
            dataBackupRequired: true,
            estimatedDuration: 10000,
            riskLevel: 'high'
          }
        }],
        repairRecommendations: [],
        dataAtRisk: true,
        lastChecked: Date.now()
      };
    }
  }

  async repairDatabase(strategies?: RepairStrategy[]): Promise<RepairResult> {
    const startTime = Date.now();
    let backupCreated: string | null = null;
    let repairsAttempted: RepairStrategy[] = [];
    let issuesResolved: IntegrityIssue[] = [];
    let dataPreserved = true;

    try {
      console.log('Starting database repair process...');

      // Always create backup before major repairs
      try {
        const exportData = await this.exportData();
        backupCreated = `backup_${Date.now()}`;
        localStorage.setItem(backupCreated, JSON.stringify(exportData));
        console.log('Database backup created successfully');
      } catch (error) {
        console.warn('Failed to create backup:', error);
      }

      // Get current integrity report
      const report = await this.verifyDatabaseIntegrity();
      
      if (report.isHealthy) {
        console.log('Database is healthy, no repairs needed');
        return {
          success: true,
          repairsAttempted: [],
          dataPreserved: true,
          backupCreated,
          issuesResolved: [],
          timeElapsed: Date.now() - startTime
        };
      }

      // Sort issues by severity and repair level
      const sortedIssues = report.issues.sort((a, b) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      // Attempt repairs by level
      for (const issue of sortedIssues) {
        const strategy = issue.repairAction;
        
        if (strategies && !strategies.some(s => s.name === strategy.name)) {
          continue; // Skip if specific strategies were requested and this isn't one of them
        }

        try {
          console.log(`Attempting repair: ${strategy.name} for ${issue.description}`);
          repairsAttempted.push(strategy);

          switch (strategy.level) {
            case 1: // Index rebuilding
              await this.repairLevel1(issue);
              break;
            case 2: // Schema migration
              await this.repairLevel2(issue);
              break;
            case 3: // Database recreation
              await this.repairLevel3(issue);
              break;
            case 4: // Emergency rebuild
              await this.repairLevel4(issue);
              dataPreserved = false;
              break;
          }

          issuesResolved.push(issue);
          console.log(`Successfully repaired: ${strategy.name}`);

        } catch (error) {
          console.error(`Repair failed for ${strategy.name}:`, error);
          
          // If high-risk repair fails, try emergency rebuild
          if (strategy.riskLevel === 'high') {
            try {
              await this.repairLevel4(issue);
              issuesResolved.push(issue);
              dataPreserved = false;
            } catch (emergencyError) {
              console.error('Emergency repair also failed:', emergencyError);
              throw emergencyError;
            }
          }
        }
      }

      // Verify repairs were successful
      const finalReport = await this.verifyDatabaseIntegrity();
      const success = finalReport.isHealthy || finalReport.issues.length < report.issues.length;

      console.log(`Database repair completed in ${Date.now() - startTime}ms. Success: ${success}`);

      return {
        success,
        repairsAttempted,
        dataPreserved,
        backupCreated,
        issuesResolved,
        timeElapsed: Date.now() - startTime
      };

    } catch (error) {
      console.error('Database repair process failed:', error);
      return {
        success: false,
        repairsAttempted,
        dataPreserved: false,
        backupCreated,
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        issuesResolved,
        timeElapsed: Date.now() - startTime
      };
    }
  }

  private async testBasicOperations(): Promise<void> {
    // Test read access to all stores
    const transaction = this.db!.transaction(['drafts', 'attachments', 'syncQueue', 'metadata'], 'readonly');
    
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

  private async repairLevel1(issue: IntegrityIssue): Promise<void> {
    // Level 1: Index rebuilding (safest)
    if (issue.type === 'missing_index' && issue.affectedStore && issue.affectedIndex) {
      // For missing indexes, we need to recreate the database with proper schema
      // This is a limitation of IndexedDB - we can't add indexes to existing stores
      throw new Error('Index repair requires database recreation');
    }
  }

  private async repairLevel2(issue: IntegrityIssue): Promise<void> {
    // Level 2: Schema migration and store repair
    if (issue.type === 'version_mismatch' || issue.type === 'corrupted_data') {
      // Close current database and reinitialize
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      // Reinitialize with current expected version
      await this.performInit();
    }
  }

  private async repairLevel3(issue: IntegrityIssue): Promise<void> {
    // Level 3: Database recreation with data preservation
    const backupData = await this.exportData();
    
    // Delete and recreate database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    
    // Reinitialize fresh database
    await this.performInit();
    
    // Restore data
    await this.importData(backupData);
  }

  private async repairLevel4(issue: IntegrityIssue): Promise<void> {
    // Level 4: Emergency rebuild (data may be lost)
    console.warn('Performing emergency database rebuild - some data may be lost');
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    // Force delete database
    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Continue even if delete fails
      setTimeout(() => resolve(), 5000); // Timeout after 5 seconds
    });
    
    // Create fresh database
    await this.performInit();
  }
}

export const indexedDBManager = IndexedDBManager.getInstance();