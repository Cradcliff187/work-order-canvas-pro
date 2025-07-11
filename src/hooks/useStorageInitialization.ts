import { useState, useCallback } from 'react';
import { indexedDBManager } from '@/utils/indexedDB/index';
import { memoryStorageManager } from '@/utils/memoryStorage';
import { useToast } from '@/hooks/use-toast';
import type { StorageManager } from '@/types/offline';

type InitializationState = 'initializing' | 'retrying' | 'upgrading' | 'ready' | 'fallback' | 'failed';

type StorageError = {
  type: 'VersionError' | 'QuotaError' | 'CorruptionError' | 'SecurityError' | 'UnknownError';
  message: string;
  recoverable: boolean;
};

export function useStorageInitialization() {
  const [storageManager, setStorageManager] = useState<StorageManager>(indexedDBManager);
  const [initializationState, setInitializationState] = useState<InitializationState>('initializing');
  const [initializationError, setInitializationError] = useState<StorageError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const { toast } = useToast();

  const classifyError = (error: any): StorageError => {
    const message = error?.message || 'Unknown error occurred';
    
    if (message.includes('version') || message.includes('VersionError')) {
      return { type: 'VersionError', message, recoverable: true };
    }
    if (message.includes('quota') || message.includes('storage')) {
      return { type: 'QuotaError', message, recoverable: true };
    }
    if (message.includes('corrupt') || message.includes('invalid')) {
      return { type: 'CorruptionError', message, recoverable: true };
    }
    if (message.includes('security') || message.includes('permission')) {
      return { type: 'SecurityError', message, recoverable: false };
    }
    
    return { type: 'UnknownError', message, recoverable: true };
  };

  const detectAndHandleExistingDatabases = async (): Promise<void> => {
    try {
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases();
        const workOrderDBs = databases.filter(db => 
          db.name?.includes('WorkOrderPro') || db.name?.includes('workorder')
        );
        
        // Check for version conflicts and force reset if needed
        for (const db of workOrderDBs) {
          if (db.name && db.version && db.version > 3) {
            console.log(`Database ${db.name} has version ${db.version}, forcing reset...`);
            await indexedDB.deleteDatabase(db.name);
          }
        }
        
        if (workOrderDBs.length > 1) {
          console.log('Multiple WorkOrder databases detected, cleaning up...');
          for (const db of workOrderDBs.slice(1)) {
            if (db.name) {
              await indexedDB.deleteDatabase(db.name);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to detect existing databases:', error);
    }
  };

  const handleStorageFallback = async (error: StorageError): Promise<void> => {
    try {
      setInitializationState('fallback');
      await memoryStorageManager.init();
      setStorageManager(memoryStorageManager);
      setIsUsingFallback(true);
      
      if (!error.recoverable) {
        toast({
          title: "Storage Issue",
          description: "Using temporary storage until resolved",
        });
      }
    } catch (fallbackError) {
      console.error('Memory storage fallback also failed:', fallbackError);
      setInitializationState('failed');
      toast({
        title: "Storage Error",
        description: "Storage initialization failed completely",
        variant: "destructive",
      });
    }
  };

  const initializeStorageWithRetry = useCallback(async (maxRetries = 3): Promise<void> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      setRetryCount(attempt - 1);
      
      try {
        if (attempt === 1) {
          setInitializationState('initializing');
          console.log('Storage initialization attempt 1/3');
          await detectAndHandleExistingDatabases();
        } else {
          setInitializationState('retrying');
          console.log(`Storage initialization retry ${attempt}/${maxRetries}`);
          
          const delays = [0, 500, 1000, 2000];
          const delay = delays[attempt - 1] || 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        setInitializationState('upgrading');
        await indexedDBManager.init();
        
        // Verify database integrity after initialization
        console.log('Verifying database integrity...');
        const integrityReport = await indexedDBManager.verifyDatabaseIntegrity();
        
        if (!integrityReport.isHealthy) {
          console.warn('Database integrity issues detected, attempting repairs...');
          
          // Attempt automatic repair for minor issues
          const minorIssues = integrityReport.issues.filter(issue => 
            issue.severity === 'low' || issue.severity === 'medium'
          );
          
          if (minorIssues.length > 0) {
            const repairResult = await indexedDBManager.repairDatabase(
              minorIssues.map(issue => issue.repairAction)
            );
            
            if (repairResult.success) {
              console.log('Database repairs completed successfully');
              toast({
                title: "Database Repaired",
                description: `Fixed ${repairResult.issuesResolved.length} issues automatically`,
              });
            } else {
              console.warn('Database repairs failed, some issues may persist');
            }
          }
        }
        
        setStorageManager(indexedDBManager);
        setIsUsingFallback(false);
        setInitializationState('ready');
        setInitializationError(null);
        return;
        
      } catch (error) {
        const storageError = classifyError(error);
        setInitializationError(storageError);
        
        console.error(`Storage init attempt ${attempt} failed:`, error);
        
        // If this is a recoverable error, try repair before retrying
        if (storageError.recoverable && attempt < maxRetries) {
          try {
            console.log('Attempting database repair before retry...');
            const repairResult = await indexedDBManager.repairDatabase();
            if (repairResult.success) {
              console.log('Database repaired, continuing with initialization');
              continue;
            }
          } catch (repairError) {
            console.warn('Database repair failed:', repairError);
          }
        }
        
        if (attempt < maxRetries) {
          toast({
            title: `Storage Retry ${attempt}/${maxRetries}`,
            description: `Initialization failed, retrying in ${[0, 500, 1000, 2000][attempt] || 2000}ms...`,
          });
        }
        
        if (attempt === maxRetries) {
          await handleStorageFallback(storageError);
          return;
        }
      }
    }
  }, [toast]);

  const retryInitialization = useCallback(async (): Promise<void> => {
    setInitializationError(null);
    await initializeStorageWithRetry();
  }, []);

  const resetStorageWithConfirmation = useCallback(async (): Promise<void> => {
    if (!confirm('This will clear all offline data. Are you sure?')) {
      return;
    }
    
    try {
      setInitializationState('initializing');
      
      await indexedDB.deleteDatabase('WorkOrderProDB');
      localStorage.removeItem('workorder-fallback-storage');
      
      await initializeStorageWithRetry();
      
      toast({
        title: "Storage Reset",
        description: "Storage has been cleared and reinitialized",
      });
    } catch (error) {
      console.error('Failed to reset storage:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset storage",
        variant: "destructive",
      });
    }
  }, []);

  return {
    storageManager,
    initializationState,
    initializationError,
    retryCount,
    isUsingFallback,
    initializeStorageWithRetry,
    retryInitialization,
    resetStorageWithConfirmation,
  };
}