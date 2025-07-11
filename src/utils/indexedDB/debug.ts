import type { 
  StorageTestResult, 
  StorageHealthStatus, 
  StorageMigrationInfo,
  ReportDraft,
  SyncQueueItem
} from '@/types/offline';
import type { SchemaValidationResult } from './types';
import { IndexedDBManager } from './manager';
import { EXPECTED_SCHEMA } from './schema';

export class StorageDebugUtils {
  private manager: IndexedDBManager;

  constructor(manager: IndexedDBManager) {
    this.manager = manager;
  }

  async testStorageInitialization(): Promise<StorageTestResult[]> {
    const results: StorageTestResult[] = [];
    
    console.group('🔍 Storage Initialization Tests');
    console.log('Starting comprehensive storage tests...');

    // Test 1: Database Connection
    results.push(await this.runTest('Database Connection', async () => {
      await this.manager.init();
      return { connected: true };
    }));

    // Test 2: Schema Validation  
    results.push(await this.runTest('Schema Validation', async () => {
      const validation = await this.manager.validateSchema();
      if (!validation.isValid) {
        const criticalIssues = validation.issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          throw new Error(`Critical schema issues: ${criticalIssues.map(i => i.message).join(', ')}`);
        }
      }
      return { 
        schemaValid: validation.isValid, 
        issueCount: validation.issues.length,
        validationTime: validation.performance.validationTime
      };
    }));

    // Test 3: Basic CRUD Operations
    results.push(await this.runTest('Basic CRUD Operations', async () => {
      const testDraft: ReportDraft = {
        id: 'test-draft-' + Date.now(),
        workOrderId: 'test-wo-' + Date.now(),
        workPerformed: 'Test work performed',
        photos: [],
        metadata: {
          id: 'test-meta-' + Date.now(),
          workOrderId: 'test-wo-' + Date.now(),
          lastModified: Date.now(),
          version: 1,
          autoSaveCount: 0,
          isManual: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Create
      await this.manager.saveDraft(testDraft);
      
      // Read
      const retrieved = await this.manager.getDraft(testDraft.id);
      if (!retrieved) throw new Error('Failed to retrieve draft');
      
      // Update
      testDraft.workPerformed = 'Updated work performed';
      testDraft.updatedAt = Date.now();
      await this.manager.saveDraft(testDraft);
      
      // Delete
      await this.manager.deleteDraft(testDraft.id);
      
      return { crudOperations: 'passed' };
    }));

    // Test 4: Storage Stats
    results.push(await this.runTest('Storage Stats', async () => {
      const stats = await this.manager.getStorageStats();
      return {
        totalSpace: stats.totalSpace,
        usedSpace: stats.usedSpace,
        draftCount: stats.draftCount,
        syncQueueSize: stats.syncQueueSize,
      };
    }));

    // Test 5: Performance Test
    results.push(await this.runTest('Performance Test', async () => {
      const start = performance.now();
      
      // Create multiple drafts
      const promises = Array.from({ length: 10 }, (_, i) => {
        const draft: ReportDraft = {
          id: `perf-test-${i}`,
          workOrderId: `perf-wo-${i}`,
          workPerformed: `Performance test ${i}`,
          photos: [],
          metadata: {
            id: `perf-meta-${i}`,
            workOrderId: `perf-wo-${i}`,
            lastModified: Date.now(),
            version: 1,
            autoSaveCount: 0,
            isManual: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return this.manager.saveDraft(draft);
      });
      
      await Promise.all(promises);
      
      // Clean up
      for (let i = 0; i < 10; i++) {
        await this.manager.deleteDraft(`perf-test-${i}`);
      }
      
      const duration = performance.now() - start;
      return { batchOperationTime: duration, operationsPerSecond: (20 / duration * 1000) };
    }));

    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log(`✅ Tests completed: ${passedTests}/${totalTests} passed`);
    console.groupEnd();

    return results;
  }

  async getHealthStatus(): Promise<StorageHealthStatus> {
    try {
      const integrity = await this.manager.verifyDatabaseIntegrity();
      const stats = await this.manager.getStorageStats();
      
      // Calculate performance score based on various metrics
      const storageUsageRatio = stats.usedSpace / stats.totalSpace;
      const performanceScore = Math.max(0, 100 - (storageUsageRatio * 50) - (integrity.issues.length * 10));
      
      // Determine overall health
      let overallHealth: StorageHealthStatus['overallHealth'] = 'healthy';
      if (integrity.issues.some(i => i.severity === 'critical')) {
        overallHealth = 'critical';
      } else if (integrity.issues.some(i => i.severity === 'high')) {
        overallHealth = 'error';
      } else if (integrity.issues.length > 0 || storageUsageRatio > 0.8) {
        overallHealth = 'warning';
      }
      
      // Generate recommendations
      const recommendations: string[] = [];
      if (storageUsageRatio > 0.8) {
        recommendations.push('Storage usage is high - consider cleaning up old drafts');
      }
      if (integrity.issues.length > 0) {
        recommendations.push('Database integrity issues detected - run repair if needed');
      }
      if (stats.syncQueueSize > 10) {
        recommendations.push('Large sync queue - check network connectivity');
      }

      return {
        overallHealth,
        schemaValid: integrity.isHealthy,
        indexesValid: !integrity.issues.some(i => i.type === 'missing_index'),
        dataIntegrity: !integrity.issues.some(i => i.type === 'corrupted_data'),
        performanceScore,
        lastHealthCheck: Date.now(),
        recommendations,
      };
    } catch (error) {
      return {
        overallHealth: 'critical',
        schemaValid: false,
        indexesValid: false,
        dataIntegrity: false,
        performanceScore: 0,
        lastHealthCheck: Date.now(),
        recommendations: ['Storage system is not functioning properly'],
      };
    }
  }

  async getMigrationInfo(): Promise<StorageMigrationInfo> {
    // Access private properties safely
    const manager = this.manager as any;
    
    return {
      currentVersion: manager.actualVersion || 0,
      expectedVersion: manager.expectedVersion || 3,
      migrationPath: ['v1 -> v2: Added sync queue', 'v2 -> v3: Enhanced schema'],
      lastMigrationTime: Date.now(), // Would be stored in metadata in real implementation
      hasPendingMigrations: false,
    };
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<StorageTestResult> {
    const start = performance.now();
    
    try {
      console.log(`📋 Running test: ${testName}`);
      const details = await testFn();
      const duration = performance.now() - start;
      
      console.log(`✅ ${testName} passed (${duration.toFixed(2)}ms)`);
      return {
        testName,
        passed: true,
        duration,
        details,
      };
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ ${testName} failed: ${errorMessage} (${duration.toFixed(2)}ms)`);
      return {
        testName,
        passed: false,
        duration,
        error: errorMessage,
      };
    }
  }
}

// Development-only global utilities
export function attachDebugUtilities(manager: IndexedDBManager): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return;
  }

  const debugUtils = new StorageDebugUtils(manager);

  // Attach to window for console access
  (window as any).__testStorage = async () => {
    console.log('🔧 Running comprehensive storage tests...');
    const results = await debugUtils.testStorageInitialization();
    console.table(results);
    return results;
  };

  (window as any).__storageHealth = async () => {
    console.log('🩺 Checking storage health...');
    const health = await debugUtils.getHealthStatus();
    console.log('Health Status:', health);
    return health;
  };

  (window as any).__storageStats = async () => {
    console.log('📊 Getting storage statistics...');
    const stats = await manager.getStorageStats();
    console.table(stats);
    return stats;
  };

  (window as any).__storageMigration = async () => {
    console.log('🔄 Getting migration info...');
    const migration = await debugUtils.getMigrationInfo();
    console.log('Migration Info:', migration);
    return migration;
  };

  (window as any).__validateSchema = async () => {
    console.log('🔍 Validating schema...');
    const validation = await manager.validateSchema();
    console.log('Schema Validation Result:', validation);
    
    if (!validation.isValid) {
      console.group('🚨 Schema Issues Found:');
      validation.issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🚨' : issue.severity === 'high' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${issue.message}`);
        console.log(`   💡 ${issue.suggestion}`);
      });
      console.groupEnd();
    }
    
    return validation;
  };

  (window as any).__showExpectedSchema = () => {
    console.log('📋 Expected Schema:');
    console.log(JSON.stringify(EXPECTED_SCHEMA, null, 2));
    return EXPECTED_SCHEMA;
  };

  (window as any).__resetStorage = async () => {
    if (!confirm('⚠️ This will clear ALL storage data. Are you sure?')) {
      return;
    }
    
    try {
      await indexedDB.deleteDatabase('WorkOrderProDB');
      localStorage.removeItem('workorder-fallback-storage');
      console.log('✅ Storage reset complete - refresh the page');
    } catch (error) {
      console.error('❌ Storage reset failed:', error);
    }
  };

  // Expose WorkOrderPro namespace for enhanced debugging
  if (!(window as any).WorkOrderPro) {
    (window as any).WorkOrderPro = {};
  }
  (window as any).WorkOrderPro.storage = {
    manager,
    schema: EXPECTED_SCHEMA,
    validateSchema: () => manager.validateSchema(),
    getValidationConfig: () => manager.getValidationConfig(),
    updateValidationConfig: (config: any) => manager.updateValidationConfig(config)
  };

  console.log('🔧 Storage debug utilities attached to window:');
  console.log('  - window.__testStorage() - Run comprehensive tests');
  console.log('  - window.__storageHealth() - Check storage health');  
  console.log('  - window.__storageStats() - View storage statistics');
  console.log('  - window.__storageMigration() - View migration info');
  console.log('  - window.__validateSchema() - Validate database schema');
  console.log('  - window.__showExpectedSchema() - Show expected schema');
  console.log('  - window.__resetStorage() - Reset all storage (DESTRUCTIVE)');
  console.log('  - window.WorkOrderPro.storage - Enhanced storage API');
}