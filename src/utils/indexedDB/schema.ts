import type { SchemaStore, MigrationFunction, ExpectedSchemaDefinition } from './types';

export const EXPECTED_SCHEMA: ExpectedSchemaDefinition = {
  version: 3,
  stores: {
    drafts: {
      keyPath: 'id',
      indexes: {
        workOrderId: { keyPath: 'workOrderId', unique: false },
        updatedAt: { keyPath: 'updatedAt', unique: false },
        isManual: { keyPath: 'metadata.isManual', unique: false }
      }
    },
    attachments: {
      keyPath: 'id',
      indexes: {
        draftId: { keyPath: 'draftId', unique: false },
        size: { keyPath: 'size', unique: false }
      }
    },
    syncQueue: {
      keyPath: 'id',
      indexes: {
        type: { keyPath: 'type', unique: false },
        priority: { keyPath: 'priority', unique: false },
        nextAttempt: { keyPath: 'nextAttempt', unique: false }
      }
    },
    metadata: {
      keyPath: 'key',
      indexes: {}
    }
  }
};

export const SCHEMA_STORES: SchemaStore[] = [
  {
    name: 'drafts',
    keyPath: 'id',
    indexes: [
      { name: 'workOrderId', keyPath: 'workOrderId', unique: false },
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
      { name: 'isManual', keyPath: 'metadata.isManual', unique: false }
    ]
  },
  {
    name: 'attachments',
    keyPath: 'id',
    indexes: [
      { name: 'draftId', keyPath: 'draftId', unique: false },
      { name: 'size', keyPath: 'size', unique: false }
    ]
  },
  {
    name: 'syncQueue',
    keyPath: 'id',
    indexes: [
      { name: 'type', keyPath: 'type', unique: false },
      { name: 'priority', keyPath: 'priority', unique: false },
      { name: 'nextAttempt', keyPath: 'nextAttempt', unique: false }
    ]
  },
  {
    name: 'metadata',
    keyPath: 'key',
    indexes: []
  }
];

export const MIGRATIONS: Record<number, MigrationFunction> = {
  1: upgradeToV1,
  2: upgradeToV2,
  3: upgradeToV3,
};

function upgradeToV1(db: IDBDatabase): void {
  // Initial schema creation
  if (!db.objectStoreNames.contains('drafts')) {
    const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
    draftsStore.createIndex('workOrderId', 'workOrderId', { unique: false });
    draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
  }
}

function upgradeToV2(db: IDBDatabase): void {
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

function upgradeToV3(db: IDBDatabase): void {
  // Version 3: Complete schema consolidation and index validation
  createCompleteSchema(db);
}

export function createCompleteSchema(db: IDBDatabase): void {
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