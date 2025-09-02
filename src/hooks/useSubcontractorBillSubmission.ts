import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/useFileUpload';

interface SubmitSubcontractorBillData {
  external_invoice_number?: string;
  total_amount: number;
  invoice_date?: Date;
  due_date?: Date;
  payment_terms?: string;
  purchase_order_number?: string;
  subcontractor_notes?: string;
  work_orders: Array<{
    work_order_id: string;
    amount: number;
    description?: string;
  }>;
  attachments?: File[];
}

// Helper function to convert dates to date-only strings
const toDateOnlyString = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export const useSubcontractorBillSubmission = () => {
  const { uploadFiles } = useFileUpload();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitSubcontractorBill = useMutation({
    mutationFn: async (data: SubmitSubcontractorBillData) => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      // Get user's organization
      const { data: userOrg, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', profile.id)
        .single();

      if (orgError || !userOrg) {
        throw new Error('User organization not found');
      }

      // Prepare bill data
      const billData = {
        external_invoice_number: data.external_invoice_number || null,
        total_amount: data.total_amount,
        invoice_date: toDateOnlyString(data.invoice_date) || new Date().toISOString().split('T')[0],
        due_date: toDateOnlyString(data.due_date) || null,
        payment_terms: data.payment_terms || 'Net 30',
        purchase_order_number: data.purchase_order_number || null,
        subcontractor_notes: data.subcontractor_notes || null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_by: profile.id,
        subcontractor_organization_id: userOrg.organization_id,
        internal_invoice_number: '', // Will be set by trigger
      };

      // Insert bill
      const { data: bill, error: billError } = await supabase
        .from('subcontractor_bills')
        .insert(billData)
        .select('id, internal_invoice_number')
        .single();

      if (billError) {
        console.error('Bill insertion error:', billError);
        throw billError;
      }

      // Get approved work order reports for the work orders
      const workOrderIds = data.work_orders.map(wo => wo.work_order_id);
      const { data: approvedReports, error: reportsError } = await supabase
        .from('work_order_reports')
        .select('id, work_order_id')
        .in('work_order_id', workOrderIds)
        .eq('status', 'approved');

      if (reportsError) {
        console.error('Error fetching approved reports:', reportsError);
        throw reportsError;
      }

      // Create work order relationships
      const workOrderRelations = data.work_orders.map(wo => ({
        subcontractor_bill_id: bill.id,
        work_order_id: wo.work_order_id,
        work_order_report_id: approvedReports?.find(r => r.work_order_id === wo.work_order_id)?.id || null,
        amount: wo.amount,
        description: wo.description || null,
      }));

      const { error: workOrderError } = await supabase
        .from('subcontractor_bill_work_orders')
        .insert(workOrderRelations);

      if (workOrderError) {
        console.error('Work order relation error:', workOrderError);
        throw workOrderError;
      }

      // Upload attachments if provided
      if (data.attachments && data.attachments.length > 0) {
        try {
          const firstWorkOrderId = data.work_orders[0]?.work_order_id;
          if (firstWorkOrderId) {
            const uploadedFiles = await uploadFiles(data.attachments, firstWorkOrderId, false);
            
            // Create bill attachment records
            const attachmentRecords = uploadedFiles.map(file => ({
              subcontractor_bill_id: bill.id,
              work_order_id: firstWorkOrderId,
              file_name: file.fileName || 'attachment.file',
              file_url: file.fileUrl || '',
              file_type: 'document' as const,
              file_size: file.fileSize || 0,
              uploaded_by: profile.id,
            }));

            const { error: attachmentError } = await supabase
              .from('subcontractor_bill_attachments')
              .insert(attachmentRecords);

            if (attachmentError) {
              console.error('Attachment creation error:', attachmentError);
              // Don't throw here, as the bill was created successfully
            }
          }
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          // Don't throw here, as the bill was created successfully
        }
      }

      return bill;
    },
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
      toast({
        title: 'Bill Submitted Successfully',
        description: `Bill ${bill.internal_invoice_number} has been submitted for approval.`,
      });
    },
    onError: (error) => {
      console.error('Bill submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    submitSubcontractorBill: submitSubcontractorBill.mutate,
    submitSubcontractorBillAsync: submitSubcontractorBill.mutateAsync,
    isSubmitting: submitSubcontractorBill.isPending,
  };
};