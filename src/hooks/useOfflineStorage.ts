import { useState, useEffect } from 'react';
import Dexie, { Table } from 'dexie';

interface WorkOrder {
  id: string;
  title: string;
  description?: string;
  status: string;
  store_location?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  trade_id?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface PendingReport {
  id: string;
  workOrderId: string;
  workPerformed: string;
  materialsUsed?: string;
  hoursWorked?: number;
  invoiceAmount: number;
  invoiceNumber?: string;
  notes?: string;
  photos?: File[];
  timestamp: number;
  synced: number; // 0 for false, 1 for true
}

interface PendingSync {
  id: string;
  type: 'report' | 'status_update';
  data: any;
  timestamp: number;
  retryCount: number;
}

class WorkOrderProDB extends Dexie {
  workOrders!: Table<WorkOrder>;
  pendingReports!: Table<PendingReport>;
  pendingSyncs!: Table<PendingSync>;

  constructor() {
    super('WorkOrderProDB');
    
    this.version(1).stores({
      workOrders: 'id, status, assigned_to, created_at',
      pendingReports: 'id, workOrderId, timestamp, synced',
      pendingSyncs: 'id, type, timestamp, retryCount'
    });
  }
}

const db = new WorkOrderProDB();

export function useOfflineStorage() {
  const [isReady, setIsReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    db.open().then(() => {
      setIsReady(true);
      updatePendingCount();
    });

    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const updatePendingCount = async () => {
    try {
      const [pendingReports, pendingSyncs] = await Promise.all([
        db.pendingReports.where('synced').equals(0).count(),
        db.pendingSyncs.count()
      ]);
      setPendingCount(pendingReports + pendingSyncs);
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  };

  const cacheWorkOrders = async (workOrders: WorkOrder[]) => {
    try {
      await db.workOrders.bulkPut(workOrders);
    } catch (error) {
      console.error('Error caching work orders:', error);
    }
  };

  const getCachedWorkOrders = async (): Promise<WorkOrder[]> => {
    try {
      return await db.workOrders.toArray();
    } catch (error) {
      console.error('Error getting cached work orders:', error);
      return [];
    }
  };

  const saveReportDraft = async (report: Omit<PendingReport, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.pendingReports.add({
        ...report,
        id,
        timestamp: Date.now(),
        synced: 0
      });
      updatePendingCount();
      return id;
    } catch (error) {
      console.error('Error saving report draft:', error);
      throw error;
    }
  };

  const getPendingReports = async (): Promise<PendingReport[]> => {
    try {
      return await db.pendingReports.where('synced').equals(0).toArray();
    } catch (error) {
      console.error('Error getting pending reports:', error);
      return [];
    }
  };

  const markReportSynced = async (reportId: string) => {
    try {
      await db.pendingReports.update(reportId, { synced: 1 });
      updatePendingCount();
    } catch (error) {
      console.error('Error marking report as synced:', error);
    }
  };

  const queueSync = async (type: PendingSync['type'], data: any) => {
    try {
      const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.pendingSyncs.add({
        id,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0
      });
      updatePendingCount();
    } catch (error) {
      console.error('Error queueing sync:', error);
    }
  };

  const processPendingSyncs = async () => {
    try {
      const pendingSyncs = await db.pendingSyncs.toArray();
      
      for (const sync of pendingSyncs) {
        try {
          // Process sync based on type
          if (sync.type === 'report') {
            // Submit report to server
            // Implementation would depend on your API
          } else if (sync.type === 'status_update') {
            // Update work order status
            // Implementation would depend on your API
          }

          // Remove from queue if successful
          await db.pendingSyncs.delete(sync.id);
        } catch (error) {
          // Increment retry count
          await db.pendingSyncs.update(sync.id, { 
            retryCount: sync.retryCount + 1 
          });
          
          // Remove if too many retries
          if (sync.retryCount >= 3) {
            await db.pendingSyncs.delete(sync.id);
          }
        }
      }
      
      updatePendingCount();
    } catch (error) {
      console.error('Error processing pending syncs:', error);
    }
  };

  const clearCache = async () => {
    try {
      await Promise.all([
        db.workOrders.clear(),
        db.pendingReports.clear(),
        db.pendingSyncs.clear()
      ]);
      updatePendingCount();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  return {
    isReady,
    pendingCount,
    cacheWorkOrders,
    getCachedWorkOrders,
    saveReportDraft,
    getPendingReports,
    markReportSynced,
    queueSync,
    processPendingSyncs,
    clearCache,
  };
}