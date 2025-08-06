import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApprovalItem } from './useApprovalQueue';
import { useAdminReportMutations } from './useAdminReportMutations';
import { useInvoiceMutations } from './useInvoiceMutations';
import { useToast } from './use-toast';

interface BulkOperationState {
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  errors: Array<{ itemId: string; error: string }>;
  currentItem?: string;
}

export function useBulkApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { reviewReport } = useAdminReportMutations();
  const { approveInvoice, rejectInvoice } = useInvoiceMutations();
  
  const [state, setState] = useState<BulkOperationState>({
    isProcessing: false,
    processedCount: 0,
    totalCount: 0,
    errors: [],
  });

  const updateProgress = useCallback((processed: number, total: number, currentItem?: string, error?: { itemId: string; error: string }) => {
    setState(prev => ({
      ...prev,
      processedCount: processed,
      totalCount: total,
      currentItem,
      errors: error ? [...prev.errors, error] : prev.errors
    }));
  }, []);

  const bulkApprove = useCallback(async (items: ApprovalItem[]) => {
    if (items.length === 0) return;

    setState({
      isProcessing: true,
      processedCount: 0,
      totalCount: items.length,
      errors: [],
    });

    toast({
      title: "Bulk Approval Started",
      description: `Processing ${items.length} items...`,
    });

    let successful = 0;
    const errors: Array<{ itemId: string; error: string }> = [];

    for (const [index, item] of items.entries()) {
      updateProgress(index, items.length, item.title);

      try {
        if (item.type === 'report') {
          await reviewReport.mutateAsync({ 
            reportId: item.id, 
            status: 'approved' 
          });
        } else {
          await approveInvoice.mutateAsync({ 
            invoiceId: item.id 
          });
        }
        successful++;
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        errors.push({ itemId: item.id, error: errorMessage });
        console.error(`Failed to approve ${item.title}:`, error);
      }

      // Small delay to prevent overwhelming the server
      if (index < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      processedCount: items.length,
      errors
    }));

    // Refresh approval queue
    queryClient.invalidateQueries({ queryKey: ['approval-queue'] });

    // Show completion toast
    if (errors.length === 0) {
      toast({
        title: "Bulk Approval Complete",
        description: `Successfully approved ${successful} items.`,
      });
    } else {
      toast({
        title: "Bulk Approval Complete with Errors",
        description: `Approved ${successful} items, ${errors.length} failed.`,
        variant: "destructive",
      });
    }
  }, [reviewReport, approveInvoice, queryClient, toast, updateProgress]);

  const bulkReject = useCallback(async (items: ApprovalItem[], rejectionReason?: string) => {
    if (items.length === 0) return;

    setState({
      isProcessing: true,
      processedCount: 0,
      totalCount: items.length,
      errors: [],
    });

    toast({
      title: "Bulk Rejection Started",
      description: `Processing ${items.length} items...`,
    });

    let successful = 0;
    const errors: Array<{ itemId: string; error: string }> = [];

    for (const [index, item] of items.entries()) {
      updateProgress(index, items.length, item.title);

      try {
        if (item.type === 'report') {
          await reviewReport.mutateAsync({ 
            reportId: item.id, 
            status: 'rejected',
            reviewNotes: rejectionReason || 'Bulk rejection from approval center'
          });
        } else {
          await rejectInvoice.mutateAsync({ 
            invoiceId: item.id,
            notes: rejectionReason || 'Bulk rejection from approval center'
          });
        }
        successful++;
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        errors.push({ itemId: item.id, error: errorMessage });
        console.error(`Failed to reject ${item.title}:`, error);
      }

      // Small delay to prevent overwhelming the server
      if (index < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      processedCount: items.length,
      errors
    }));

    // Refresh approval queue
    queryClient.invalidateQueries({ queryKey: ['approval-queue'] });

    // Show completion toast
    if (errors.length === 0) {
      toast({
        title: "Bulk Rejection Complete",
        description: `Successfully rejected ${successful} items.`,
      });
    } else {
      toast({
        title: "Bulk Rejection Complete with Errors",
        description: `Rejected ${successful} items, ${errors.length} failed.`,
        variant: "destructive",
      });
    }
  }, [reviewReport, rejectInvoice, queryClient, toast, updateProgress]);

  const cancelBulkOperation = useCallback(() => {
    setState(prev => ({ ...prev, isProcessing: false }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  return {
    bulkApprove,
    bulkReject,
    cancelBulkOperation,
    clearErrors,
    state,
    isProcessing: state.isProcessing,
    progress: state.totalCount > 0 ? (state.processedCount / state.totalCount) * 100 : 0,
    hasErrors: state.errors.length > 0
  };
}