import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAdminReportMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reviewReport = useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      reviewNotes 
    }: { 
      reportId: string; 
      status: 'approved' | 'rejected'; 
      reviewNotes?: string;
    }) => {
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id!)
        .single();

      if (!currentUser) throw new Error('User not found');

      const { data, error } = await supabase
        .from('work_order_reports')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_by_user_id: currentUser.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select(`
          *,
          work_orders!work_order_id(id, status)
        `)
        .single();

      if (error) throw error;

      // Update work order status if report is approved
      if (status === 'approved' && data.work_orders) {
        const { error: workOrderError } = await supabase
          .from('work_orders')
          .update({ 
            status: 'completed',
            date_completed: new Date().toISOString()
          })
          .eq('id', data.work_orders.id);

        if (workOrderError) {
          console.error('Failed to update work order status:', workOrderError);
        }
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      
      toast({ 
        title: `Report ${variables.status}`, 
        description: `The report has been ${variables.status} successfully.` 
      });

      // Email notification handled automatically by database trigger
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error reviewing report', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const bulkReviewReports = useMutation({
    mutationFn: async ({ 
      reportIds, 
      status, 
      reviewNotes 
    }: { 
      reportIds: string[]; 
      status: 'approved' | 'rejected'; 
      reviewNotes?: string;
    }) => {
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id!)
        .single();

      if (!currentUser) throw new Error('User not found');

      const { data, error } = await supabase
        .from('work_order_reports')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_by_user_id: currentUser.id,
          reviewed_at: new Date().toISOString()
        })
        .in('id', reportIds)
        .select(`
          id,
          work_order_id,
          work_orders!work_order_id(id)
        `);

      if (error) throw error;

      // Update work orders to completed if reports are approved
      if (status === 'approved' && data) {
        const workOrderIds = data.map(report => report.work_order_id);
        await supabase
          .from('work_orders')
          .update({ 
            status: 'completed',
            date_completed: new Date().toISOString()
          })
          .in('id', workOrderIds);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      
      toast({ 
        title: `${variables.reportIds.length} reports ${variables.status}`, 
        description: `The reports have been ${variables.status} successfully.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error reviewing reports', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  return {
    reviewReport,
    bulkReviewReports,
  };
}