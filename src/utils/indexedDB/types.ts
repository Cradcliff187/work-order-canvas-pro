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