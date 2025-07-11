export { IndexedDBManager } from './manager';
export type { IndexedDBConfig, SchemaStore, SchemaIndex, MigrationFunction } from './types';

// Create and export the singleton instance
import { IndexedDBManager } from './manager';
export const indexedDBManager = IndexedDBManager.getInstance();