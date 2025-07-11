import type { ReportDraft, SyncQueueItem, StorageStats, ExportData, StorageManager } from '@/types/offline';

// Memory-based fallback storage for when IndexedDB fails
export class MemoryStorageManager implements StorageManager {
  private static instance: MemoryStorageManager | null = null;
  private drafts: Map<string, ReportDraft> = new Map();
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private maxDrafts = 10; // Limit for memory storage

  static getInstance(): MemoryStorageManager {
    if (!MemoryStorageManager.instance) {
      MemoryStorageManager.instance = new MemoryStorageManager();
    }
    return MemoryStorageManager.instance;
  }

  async init(): Promise<void> {
    console.warn('Using memory-based storage fallback - data will not persist');
    return Promise.resolve();
  }

  async saveDraft(draft: ReportDraft): Promise<void> {
    // Limit memory usage
    if (this.drafts.size >= this.maxDrafts) {
      // Remove oldest draft
      const oldestKey = this.drafts.keys().next().value;
      if (oldestKey) {
        this.drafts.delete(oldestKey);
      }
    }
    
    this.drafts.set(draft.id, draft);
    return Promise.resolve();
  }

  async getDraft(id: string): Promise<ReportDraft | null> {
    return Promise.resolve(this.drafts.get(id) || null);
  }

  async getDraftsByWorkOrder(workOrderId: string): Promise<ReportDraft[]> {
    const drafts = Array.from(this.drafts.values())
      .filter(draft => draft.workOrderId === workOrderId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return Promise.resolve(drafts);
  }

  async deleteDraft(id: string): Promise<void> {
    this.drafts.delete(id);
    return Promise.resolve();
  }

  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    this.syncQueue.set(item.id, item);
    return Promise.resolve();
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const items = Array.from(this.syncQueue.values())
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    return Promise.resolve(items);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    this.syncQueue.delete(id);
    return Promise.resolve();
  }

  async getStorageStats(): Promise<StorageStats> {
    const drafts = Array.from(this.drafts.values());
    let totalSize = 0;
    let photoCount = 0;

    for (const draft of drafts) {
      for (const photo of draft.photos) {
        totalSize += photo.size;
        photoCount++;
      }
    }

    return Promise.resolve({
      totalSpace: 10 * 1024 * 1024, // 10MB simulated quota
      usedSpace: totalSize,
      availableSpace: 10 * 1024 * 1024 - totalSize,
      draftCount: this.drafts.size,
      photoCount,
      syncQueueSize: this.syncQueue.size,
    });
  }

  async exportData(): Promise<ExportData> {
    return Promise.resolve({
      drafts: Array.from(this.drafts.values()),
      syncQueue: Array.from(this.syncQueue.values()),
      metadata: {
        exportedAt: Date.now(),
        version: 'memory-fallback',
        deviceInfo: navigator.userAgent,
      },
    });
  }

  async importData(data: ExportData): Promise<void> {
    // Clear existing data
    this.drafts.clear();
    this.syncQueue.clear();

    // Import drafts
    if (data.drafts) {
      for (const draft of data.drafts) {
        this.drafts.set(draft.id, draft);
      }
    }

    // Import sync queue
    if (data.syncQueue) {
      for (const item of data.syncQueue) {
        this.syncQueue.set(item.id, item);
      }
    }

    return Promise.resolve();
  }

  async cleanup(): Promise<void> {
    this.drafts.clear();
    this.syncQueue.clear();
    return Promise.resolve();
  }
}

export const memoryStorageManager = MemoryStorageManager.getInstance();