import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { StorageManager, ReportDraft, PhotoAttachment } from '@/types/offline';

export function useDraftManagement(
  storageManager: StorageManager,
  isReady: boolean,
  isUsingFallback: boolean
) {
  const { toast } = useToast();

  const saveDraft = useCallback(async (
    workOrderId: string,
    formData: {
      workPerformed: string;
      materialsUsed?: string;
      hoursWorked?: number;
      notes?: string;
    },
    photos: PhotoAttachment[],
    isManual = false
  ): Promise<string> => {
    if (!isReady) {
      throw new Error('Storage not ready');
    }
    
    try {
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      
      const draft: ReportDraft = {
        id: draftId,
        workOrderId,
        ...formData,
        photos,
        metadata: {
          id: draftId,
          workOrderId,
          lastModified: now,
          version: 1,
          autoSaveCount: isManual ? 0 : 1,
          isManual,
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: now,
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      await storageManager.saveDraft(draft);
      
      if (isManual) {
        const storageType = isUsingFallback ? "(temporary)" : "";
        toast({
          title: "Draft Saved",
          description: `Report draft saved successfully ${storageType}`,
        });
      }
      
      return draftId;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save report draft",
        variant: "destructive",
      });
      throw error;
    }
  }, [isReady, storageManager, isUsingFallback, toast]);

  const getDrafts = useCallback(async (workOrderId: string): Promise<ReportDraft[]> => {
    if (!isReady) return [];
    
    try {
      return await storageManager.getDraftsByWorkOrder(workOrderId);
    } catch (error) {
      console.error('Error getting drafts:', error);
      return [];
    }
  }, [isReady, storageManager]);

  const loadDraft = useCallback(async (draftId: string): Promise<ReportDraft | null> => {
    if (!isReady) return null;
    
    try {
      return await storageManager.getDraft(draftId);
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, [isReady, storageManager]);

  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    if (!isReady) {
      toast({
        title: "Storage Not Ready",
        description: "Please wait for storage to initialize",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await storageManager.deleteDraft(draftId);
      toast({
        title: "Draft Deleted",
        description: "Report draft deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete report draft",
        variant: "destructive",
      });
    }
  }, [isReady, storageManager, toast]);

  const exportData = useCallback(async () => {
    try {
      const data = await storageManager.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `workorder-drafts-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Drafts exported successfully",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export drafts",
        variant: "destructive",
      });
    }
  }, [storageManager, toast]);

  return {
    saveDraft,
    getDrafts,
    loadDraft,
    deleteDraft,
    exportData,
  };
}