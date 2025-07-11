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
}