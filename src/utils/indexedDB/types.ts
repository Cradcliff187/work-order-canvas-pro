export interface IndexedDBConfig {
  dbName: string;
  expectedVersion: number;
  maxDraftsPerWorkOrder: number;
  maxTotalDrafts: number;
  maxPhotoSizeBytes: number;
  maxTotalStorageBytes: number;
  autoSaveIntervalMs: number;
  compressionQuality: number;
  syncRetryIntervalMs: number;
  cleanupThresholdDays: number;
}

export interface SchemaStore {
  name: string;
  keyPath: string;
  indexes: SchemaIndex[];
}

export interface SchemaIndex {
  name: string;
  keyPath: string;
  unique: boolean;
}

export interface MigrationFunction {
  (db: IDBDatabase): void;
}

export interface SchemaValidationResult {
  isValid: boolean;
  issues: SchemaValidationIssue[];
  performance: {
    validationTime: number;
    storeCount: number;
    indexCount: number;
  };
}

export interface SchemaValidationIssue {
  type: 'missing_store' | 'missing_index' | 'wrong_keypath' | 'version_mismatch' | 'index_config_mismatch';
  severity: 'critical' | 'high' | 'medium' | 'low';
  storeName?: string;
  indexName?: string;
  expected: any;
  actual: any;
  message: string;
  suggestion: string;
}

export interface ExpectedSchemaDefinition {
  version: number;
  stores: {
    [storeName: string]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes: {
        [indexName: string]: {
          keyPath: string;
          unique: boolean;
          multiEntry?: boolean;
        };
      };
    };
  };
}

export interface SchemaValidationConfig {
  enabled: boolean;
  timeout: number;
  skipStores?: string[];
  logLevel: 'silent' | 'errors' | 'warnings' | 'verbose';
}