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
import type { 
  IndexedDBConfig, 
  SchemaValidationResult, 
  SchemaValidationIssue, 
  SchemaValidationConfig 
} from './types';
import { MIGRATIONS, createCompleteSchema, EXPECTED_SCHEMA } from './schema';
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

  private validationConfig: SchemaValidationConfig = {
    enabled: process.env.NODE_ENV !== 'production',
    timeout: 100, // 100ms timeout for performance
    logLevel: process.env.NODE_ENV === 'development' ? 'verbose' : 'errors',
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
          
          // Run schema validation if enabled
          this.runSchemaValidation();
          
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

  // Schema validation methods
  async validateSchema(): Promise<SchemaValidationResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const startTime = performance.now();
    const issues: SchemaValidationIssue[] = [];

    try {
      // Validate version
      if (this.db.version !== EXPECTED_SCHEMA.version) {
        issues.push({
          type: 'version_mismatch',
          severity: 'high',
          expected: EXPECTED_SCHEMA.version,
          actual: this.db.version,
          message: `Database version mismatch: expected ${EXPECTED_SCHEMA.version}, got ${this.db.version}`,
          suggestion: 'Consider running database migration or clearing storage'
        });
      }

      // Validate each expected store
      for (const [storeName, storeConfig] of Object.entries(EXPECTED_SCHEMA.stores)) {
        if (this.validationConfig.skipStores?.includes(storeName)) {
          continue;
        }

        if (!this.db.objectStoreNames.contains(storeName)) {
          issues.push({
            type: 'missing_store',
            severity: 'critical',
            storeName,
            expected: storeConfig,
            actual: null,
            message: `Missing object store: ${storeName}`,
            suggestion: `Run schema migration to create ${storeName} store`
          });
          continue;
        }

        // For detailed index validation, we need a transaction
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        // Validate key path
        if (store.keyPath !== storeConfig.keyPath) {
          issues.push({
            type: 'wrong_keypath',
            severity: 'critical',
            storeName,
            expected: storeConfig.keyPath,
            actual: store.keyPath,
            message: `Wrong key path for ${storeName}: expected ${storeConfig.keyPath}, got ${store.keyPath}`,
            suggestion: `Recreate ${storeName} store with correct key path`
          });
        }

        // Validate indexes
        for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
          if (!store.indexNames.contains(indexName)) {
            issues.push({
              type: 'missing_index',
              severity: 'high',
              storeName,
              indexName,
              expected: indexConfig,
              actual: null,
              message: `Missing index ${indexName} on store ${storeName}`,
              suggestion: `Create index: store.createIndex('${indexName}', '${indexConfig.keyPath}', { unique: ${indexConfig.unique} })`
            });
            continue;
          }

          const index = store.index(indexName);
          if (index.keyPath !== indexConfig.keyPath || index.unique !== indexConfig.unique) {
            issues.push({
              type: 'index_config_mismatch',
              severity: 'medium',
              storeName,
              indexName,
              expected: indexConfig,
              actual: { keyPath: index.keyPath, unique: index.unique },
              message: `Index configuration mismatch for ${indexName} on ${storeName}`,
              suggestion: `Recreate index with correct configuration`
            });
          }
        }
      }

      const validationTime = performance.now() - startTime;
      const result: SchemaValidationResult = {
        isValid: issues.length === 0,
        issues,
        performance: {
          validationTime,
          storeCount: this.db.objectStoreNames.length,
          indexCount: Array.from(this.db.objectStoreNames).reduce((count, storeName) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            return count + transaction.objectStore(storeName).indexNames.length;
          }, 0)
        }
      };

      this.logValidationResults(result);
      return result;

    } catch (error) {
      const validationTime = performance.now() - startTime;
      const errorResult: SchemaValidationResult = {
        isValid: false,
        issues: [{
          type: 'version_mismatch',
          severity: 'critical',
          expected: 'successful validation',
          actual: error,
          message: `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check database integrity and try clearing storage'
        }],
        performance: {
          validationTime,
          storeCount: 0,
          indexCount: 0
        }
      };

      this.logValidationResults(errorResult);
      return errorResult;
    }
  }

  private runSchemaValidation(): void {
    if (!this.validationConfig.enabled || !this.db) {
      return;
    }

    // Run validation asynchronously to avoid blocking initialization
    setTimeout(async () => {
      try {
        const validationPromise = this.validateSchema();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Validation timeout')), this.validationConfig.timeout);
        });

        await Promise.race([validationPromise, timeoutPromise]);
      } catch (error) {
        if (this.validationConfig.logLevel !== 'silent') {
          console.warn('⚠️ Schema validation timed out or failed:', error);
        }
      }
    }, 0);
  }

  private logValidationResults(result: SchemaValidationResult): void {
    const { logLevel } = this.validationConfig;
    
    if (logLevel === 'silent') return;

    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    const highIssues = result.issues.filter(i => i.severity === 'high');
    
    if (result.isValid) {
      if (logLevel === 'verbose') {
        console.log(`✅ Schema validation passed (${result.performance.validationTime.toFixed(2)}ms)`);
        console.log(`📊 Validated ${result.performance.storeCount} stores, ${result.performance.indexCount} indexes`);
      }
      return;
    }

    // Always log critical issues
    if (criticalIssues.length > 0) {
      console.error('🚨 Critical schema validation issues:');
      criticalIssues.forEach(issue => {
        console.error(`  ❌ ${issue.message}`);
        console.error(`     💡 ${issue.suggestion}`);
      });
    }

    // Log high issues if level allows
    if (logLevel !== 'errors' && highIssues.length > 0) {
      console.warn('⚠️ High priority schema issues:');
      highIssues.forEach(issue => {
        console.warn(`  ⚠️ ${issue.message}`);
        console.warn(`     💡 ${issue.suggestion}`);
      });
    }

    // Log all issues in verbose mode
    if (logLevel === 'verbose') {
      const otherIssues = result.issues.filter(i => i.severity !== 'critical' && i.severity !== 'high');
      if (otherIssues.length > 0) {
        console.log('ℹ️ Additional schema issues:');
        otherIssues.forEach(issue => {
          console.log(`  ℹ️ ${issue.message}`);
          console.log(`     💡 ${issue.suggestion}`);
        });
      }
    }
  }

  // Getter for external access to validation config
  getValidationConfig(): SchemaValidationConfig {
    return { ...this.validationConfig };
  }

  updateValidationConfig(updates: Partial<SchemaValidationConfig>): void {
    this.validationConfig = { ...this.validationConfig, ...updates };
  }
}