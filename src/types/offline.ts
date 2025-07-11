export interface DraftMetadata {
  id: string;
  workOrderId: string;
  lastModified: number;
  version: number;
  autoSaveCount: number;
  isManual: boolean;
  deviceInfo?: {
    userAgent: string;
    timestamp: number;
  };
}

export interface PhotoAttachment {
  id: string;
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  compressedSize?: number;
  originalFile?: {
    name: string;
    lastModified: number;
  };
}

export interface ReportDraft {
  id: string;
  workOrderId: string;
  workPerformed: string;
  materialsUsed?: string;
  hoursWorked?: number;
  invoiceAmount?: number;
  invoiceNumber?: string;
  notes?: string;
  photos: PhotoAttachment[];
  metadata: DraftMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'report_submit' | 'draft_backup' | 'photo_upload';
  data: any;
  priority: number;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: number;
  nextAttempt?: number;
  error?: string;
  createdAt: number;
}

export interface StorageStats {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  draftCount: number;
  photoCount: number;
  syncQueueSize: number;
  lastCleanup?: number;
  cleanupStatus?: {
    isScheduled: boolean;
    isInProgress: boolean;
    lastRun: number | null;
    nextScheduled: number | null;
  };
}

export interface StorageState {
  isReady: boolean;
  isInitializing: boolean;
  isCleanupRunning: boolean;
  isUsingFallback: boolean;
  pendingCount: number;
  initializationError: StorageError | null;
  retryCount: number;
}

export interface StorageError {
  type: 'VersionError' | 'QuotaError' | 'CorruptionError' | 'SecurityError' | 'UnknownError';
  message: string;
  recoverable: boolean;
  timestamp: number;
}

export interface StorageMigrationInfo {
  currentVersion: number;
  expectedVersion: number;
  migrationPath: string[];
  lastMigrationTime: number | null;
  hasPendingMigrations: boolean;
}

export interface StorageTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

export interface StorageHealthStatus {
  overallHealth: 'healthy' | 'warning' | 'error' | 'critical';
  schemaValid: boolean;
  indexesValid: boolean;
  dataIntegrity: boolean;
  performanceScore: number;
  lastHealthCheck: number;
  recommendations: string[];
}

export interface OfflineConfig {
  maxDraftsPerWorkOrder: number;
  maxTotalDrafts: number;
  maxPhotoSizeBytes: number;
  maxTotalStorageBytes: number;
  autoSaveIntervalMs: number;
  compressionQuality: number;
  syncRetryIntervalMs: number;
  cleanupThresholdDays: number;
}

export interface ExportData {
  drafts: ReportDraft[];
  syncQueue: SyncQueueItem[];
  metadata: {
    exportedAt: number;
    version: string;
    deviceInfo: string;
  };
}

export interface IntegrityIssue {
  type: 'missing_store' | 'missing_index' | 'corrupted_data' | 'version_mismatch' | 'invalid_schema';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedStore?: string;
  affectedIndex?: string;
  repairAction: RepairStrategy;
}

export interface DatabaseIntegrityReport {
  isHealthy: boolean;
  issues: IntegrityIssue[];
  repairRecommendations: RepairStrategy[];
  dataAtRisk: boolean;
  lastChecked: number;
}

export interface RepairStrategy {
  level: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  dataBackupRequired: boolean;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RepairResult {
  success: boolean;
  repairsAttempted: RepairStrategy[];
  dataPreserved: boolean;
  backupCreated: string | null;
  errorDetails?: string;
  issuesResolved: IntegrityIssue[];
  timeElapsed: number;
}

export interface StorageManager {
  init(): Promise<void>;
  saveDraft(draft: ReportDraft): Promise<void>;
  getDraft(id: string): Promise<ReportDraft | null>;
  getDraftsByWorkOrder(workOrderId: string): Promise<ReportDraft[]>;
  deleteDraft(id: string): Promise<void>;
  addToSyncQueue(item: SyncQueueItem): Promise<void>;
  getSyncQueue(): Promise<SyncQueueItem[]>;
  removeSyncQueueItem(id: string): Promise<void>;
  getStorageStats(): Promise<StorageStats>;
  exportData(): Promise<ExportData>;
  importData(data: ExportData): Promise<void>;
  cleanup(): Promise<void>;
  verifyDatabaseIntegrity(): Promise<DatabaseIntegrityReport>;
  repairDatabase(strategies?: RepairStrategy[]): Promise<RepairResult>;
  
  // Debug methods (development only)
  getMigrationInfo?(): Promise<StorageMigrationInfo>;
  getHealthStatus?(): Promise<StorageHealthStatus>;
  runStorageTests?(): Promise<StorageTestResult[]>;
}