import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkOrderReportData {
  workOrderId: string;
  workPerformed: string;
  materialsUsed?: string;
  hoursWorked?: number;
  laborCost?: number;
  materialsCost?: number;
  notes?: string;
  photos?: File[];
}

export function useWorkOrderReportSubmission() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const submitReport = useMutation({
    mutationFn: async (reportData: WorkOrderReportData) => {
      if (!profile?.id) {
        throw new Error('User profile not found');
      }

      // Calculate bill amount for internal reports
      const billAmount = (reportData.laborCost || 0) + (reportData.materialsCost || 0);

      // Submit the work order report
      const reportInsert = {
        work_order_id: reportData.workOrderId,
        subcontractor_user_id: profile.id,
        work_performed: reportData.workPerformed,
        materials_used: reportData.materialsUsed,
        hours_worked: reportData.hoursWorked,
        bill_amount: billAmount > 0 ? billAmount : null,
        notes: reportData.notes,
        status: 'submitted' as const,
      };

      const { data: report, error: reportError } = await supabase
        .from('work_order_reports')
        .insert(reportInsert)
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload photos if provided
      if (reportData.photos && reportData.photos.length > 0) {
        const uploadPromises = reportData.photos.map(async (photo, index) => {
          const fileName = `${profile.id}/${report.id}/${Date.now()}_${index}_${photo.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('work-order-attachments')
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          // Create attachment record
          const { error: attachmentError } = await supabase
            .from('work_order_attachments')
            .insert({
              work_order_report_id: report.id,
              work_order_id: reportData.workOrderId,
              file_name: photo.name,
              file_url: uploadData.path,
              file_type: 'photo' as const,
              file_size: photo.size,
              uploaded_by_user_id: profile.id,
            });

          if (attachmentError) throw attachmentError;
        });

        await Promise.all(uploadPromises);
      }

      // Status transitions handled automatically by database trigger
      // When report is submitted: trigger sets status to 'in_progress'
      // When report is approved: trigger may set status to 'completed'
      // DO NOT manually update status here - it breaks the automation

      return report;
    },
    onSuccess: (data, variables) => {
      const photoCount = variables.photos?.length || 0;
      const description = photoCount > 0 
        ? `Report submitted with ${photoCount} attachment${photoCount > 1 ? 's' : ''}`
        : 'Report submitted successfully';

      toast({
        title: 'Report Submitted',
        description,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['subcontractor-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order-reports'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      console.error('Report submission error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    submitReport,
    isSubmitting: submitReport.isPending,
  };
}