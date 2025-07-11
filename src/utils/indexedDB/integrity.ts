import type { 
  DatabaseIntegrityReport, 
  IntegrityIssue, 
  RepairStrategy, 
  RepairResult 
} from '@/types/offline';
import { DatabaseOperations } from './operations';
import { createCompleteSchema } from './schema';

export class DatabaseIntegrity {
  constructor(
    private db: IDBDatabase | null,
    private dbName: string,
    private expectedVersion: number,
    private operations: DatabaseOperations | null
  ) {}

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
              if (!this.operations?.indexExists(store, indexName)) {
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
        await this.operations?.testBasicOperations();
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

  async repairDatabase(
    strategies?: RepairStrategy[],
    reinitCallback?: () => Promise<void>
  ): Promise<RepairResult> {
    const startTime = Date.now();
    let backupCreated: string | null = null;
    let repairsAttempted: RepairStrategy[] = [];
    let issuesResolved: IntegrityIssue[] = [];
    let dataPreserved = true;

    try {
      console.log('Starting database repair process...');

      // Always create backup before major repairs
      try {
        if (this.operations) {
          const exportData = await this.operations.exportData();
          backupCreated = `backup_${Date.now()}`;
          localStorage.setItem(backupCreated, JSON.stringify(exportData));
          console.log('Database backup created successfully');
        }
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
              await this.repairLevel2(issue, reinitCallback);
              break;
            case 3: // Database recreation
              await this.repairLevel3(issue, reinitCallback);
              break;
            case 4: // Emergency rebuild
              await this.repairLevel4(issue, reinitCallback);
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
              await this.repairLevel4(issue, reinitCallback);
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

  private async repairLevel1(issue: IntegrityIssue): Promise<void> {
    // Level 1: Index rebuilding (safest)
    if (issue.type === 'missing_index' && issue.affectedStore && issue.affectedIndex) {
      // For missing indexes, we need to recreate the database with proper schema
      // This is a limitation of IndexedDB - we can't add indexes to existing stores
      throw new Error('Index repair requires database recreation');
    }
  }

  private async repairLevel2(issue: IntegrityIssue, reinitCallback?: () => Promise<void>): Promise<void> {
    // Level 2: Schema migration and store repair
    if (issue.type === 'version_mismatch' || issue.type === 'corrupted_data') {
      if (reinitCallback) {
        await reinitCallback();
      }
    }
  }

  private async repairLevel3(issue: IntegrityIssue, reinitCallback?: () => Promise<void>): Promise<void> {
    // Level 3: Database recreation with data preservation
    const backupData = this.operations ? await this.operations.exportData() : null;
    
    // Delete and recreate database
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    
    // Reinitialize fresh database
    if (reinitCallback) {
      await reinitCallback();
    }
    
    // Restore data
    if (backupData && this.operations) {
      await this.operations.importData(backupData);
    }
  }

  private async repairLevel4(issue: IntegrityIssue, reinitCallback?: () => Promise<void>): Promise<void> {
    // Level 4: Emergency rebuild (data may be lost)
    console.warn('Performing emergency database rebuild - some data may be lost');
    
    // Force delete database
    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Continue even if delete fails
      setTimeout(() => resolve(), 5000); // Timeout after 5 seconds
    });
    
    // Create fresh database
    if (reinitCallback) {
      await reinitCallback();
    }
  }
}