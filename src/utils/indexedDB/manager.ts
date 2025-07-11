import type { 
  ReportDraft, 
  SyncQueueItem, 
  StorageStats, 
  ExportData, 
  StorageManager,
  DatabaseIntegrityReport,
  RepairStrategy,
  RepairResult,
  OfflineConfig,
  StorageTestResult,
  StorageHealthStatus,
  StorageMigrationInfo
} from '@/types/offline';
import type { IndexedDBConfig } from './types';
import { MIGRATIONS, createCompleteSchema } from './schema';
import { DatabaseOperations } from './operations';
import { DatabaseIntegrity } from './integrity';
import { DatabaseCleanup } from './cleanup';
import { StorageDebugUtils, attachDebugUtilities } from './debug';

export class IndexedDBManager implements StorageManager {
  private static instance: IndexedDBManager | null = null;
  private dbName = 'WorkOrderProDB';
  private expectedVersion = 3;
  private actualVersion: number | null = null;
  private db: IDBDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private operations: DatabaseOperations | null = null;
  private integrity: DatabaseIntegrity | null = null;
  private cleanupManager: DatabaseCleanup | null = null;
  private debugUtils: StorageDebugUtils | null = null;

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
          
          // Initialize helper classes
          this.operations = new DatabaseOperations(this.db);
          this.integrity = new DatabaseIntegrity(this.db, this.dbName, this.expectedVersion, this.operations);
          this.cleanupManager = new DatabaseCleanup(this.db, this.expectedVersion, this.defaultConfig, this.operations);
          this.debugUtils = new StorageDebugUtils(this);
          
          // Attach debug utilities in development
          attachDebugUtilities(this);
          
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          createCompleteSchema(db);
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
        
        // Initialize helper classes
        this.operations = new DatabaseOperations(this.db);
        this.integrity = new DatabaseIntegrity(this.db, this.dbName, this.expectedVersion, this.operations);
        this.cleanupManager = new DatabaseCleanup(this.db, this.expectedVersion, this.defaultConfig, this.operations);
        this.debugUtils = new StorageDebugUtils(this);
        
        // Attach debug utilities in development
        attachDebugUtilities(this);
        
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        createCompleteSchema(db);
      };
    });
  }

  // StorageManager interface implementation
  async saveDraft(draft: ReportDraft): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    await this.cleanupManager?.enforceStorageLimits();
    return this.operations.saveDraft(draft);
  }

  async getDraft(id: string): Promise<ReportDraft | null> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.getDraft(id);
  }

  async getDraftsByWorkOrder(workOrderId: string): Promise<ReportDraft[]> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.getDraftsByWorkOrder(workOrderId);
  }

  async deleteDraft(id: string): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.deleteDraft(id);
  }

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.addToSyncQueue(item);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.getSyncQueue();
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.removeSyncQueueItem(id);
  }

  async getStorageStats(): Promise<StorageStats> {
    if (!this.cleanupManager) throw new Error('Database not initialized');
    return this.cleanupManager.getStorageStats();
  }

  async exportData(): Promise<ExportData> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.exportData();
  }

  async importData(data: ExportData): Promise<void> {
    if (!this.operations) throw new Error('Database not initialized');
    return this.operations.importData(data);
  }

  async cleanup(): Promise<void> {
    if (!this.cleanupManager) throw new Error('Database not initialized');
    return this.cleanupManager.cleanup();
  }

  async verifyDatabaseIntegrity(): Promise<DatabaseIntegrityReport> {
    if (!this.integrity) throw new Error('Database not initialized');
    return this.integrity.verifyDatabaseIntegrity();
  }

  async repairDatabase(strategies?: RepairStrategy[]): Promise<RepairResult> {
    if (!this.integrity) throw new Error('Database not initialized');
    return this.integrity.repairDatabase(strategies, () => this.performInit());
  }

  // Debug methods (development only)
  async getMigrationInfo(): Promise<StorageMigrationInfo> {
    if (!this.debugUtils) throw new Error('Debug utilities not initialized');
    return this.debugUtils.getMigrationInfo();
  }

  async getHealthStatus(): Promise<StorageHealthStatus> {
    if (!this.debugUtils) throw new Error('Debug utilities not initialized');
    return this.debugUtils.getHealthStatus();
  }

  async runStorageTests(): Promise<StorageTestResult[]> {
    if (!this.debugUtils) throw new Error('Debug utilities not initialized');
    return this.debugUtils.testStorageInitialization();
  }
}