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
      return performReportReview({ reportId, status, reviewNotes });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      
      toast({ 
        title: `Report ${variables.status}`, 
        description: `The report has been ${variables.status} successfully.` 
      });
    },
    onError: (error: any) => {
      console.error('Report review mutation error:', error);
      const errorMessage = error?.message || 'Failed to review report';
      
      toast({ 
        title: 'Error reviewing report', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    },
    retry: 2,
  });

  const performReportReview = async ({ 
    reportId, 
    status, 
    reviewNotes 
  }: { 
    reportId: string; 
    status: 'approved' | 'rejected'; 
    reviewNotes?: string;
  }) => {
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse.user) {
      throw new Error('Authentication failed');
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userResponse.user.id)
      .single();

    if (profileError || !currentUser?.id) {
      throw new Error('User profile not found');
    }

    return performManualReportReview({ reportId, status, reviewNotes, currentUser });
  };

  const performManualReportReview = async ({ 
    reportId, 
    status, 
    reviewNotes, 
    currentUser 
  }: any) => {
    if (!currentUser?.id) {
      throw new Error('Invalid user ID');
    }

    const { data, error } = await supabase
      .from('work_order_reports')
      .update({
        status,
        review_notes: reviewNotes || null,
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

    if (status === 'approved' && data.work_orders) {
      await supabase
        .from('work_orders')
        .update({ 
          status: 'completed',
          date_completed: new Date().toISOString()
        })
        .eq('id', data.work_orders.id);
    }

    return data;
  };

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
      const { data: userResponse } = await supabase.auth.getUser();
      if (!userResponse.user) throw new Error('Not authenticated');

      const { data: currentUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userResponse.user.id)
        .single();

      if (!currentUser?.id) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('work_order_reports')
        .update({
          status,
          review_notes: reviewNotes || null,
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