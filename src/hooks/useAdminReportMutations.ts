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
      // Validate inputs
      if (!reportId || typeof reportId !== 'string') {
        throw new Error('Invalid report ID');
      }
      if (!status || !['approved', 'rejected'].includes(status)) {
        throw new Error('Invalid status');
      }
      
      return performReportReview({ reportId, status, reviewNotes });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
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
    // Check if report exists first
    const { data: reportCheck, error: reportCheckError } = await supabase
      .from('work_order_reports')
      .select('id, status')
      .eq('id', reportId)
      .single();

    if (reportCheckError) {
      throw new Error('Report not found or access denied');
    }

    if (reportCheck.status !== 'submitted') {
      throw new Error('Report is not in submitted status');
    }

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

    // When report status changes to 'approved', the database trigger
    // auto_update_report_status_enhanced() will:
    // 1. Check if all required reports are approved
    // 2. Transition work order to 'completed' if ready
    // 3. Send completion email notifications
    // Manual updates would skip these important steps

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

      // When report status changes to 'approved', the database trigger
      // auto_update_report_status_enhanced() will:
      // 1. Check if all required reports are approved
      // 2. Transition work order to 'completed' if ready
      // 3. Send completion email notifications
      // Manual updates would skip these important steps

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
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

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      if (!reportId || typeof reportId !== 'string') {
        throw new Error('Invalid report ID');
      }

      const { error } = await supabase
        .from('work_order_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      return { reportId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      
      toast({ 
        title: 'Report deleted', 
        description: 'The report has been deleted successfully.' 
      });
    },
    onError: (error: any) => {
      console.error('Report deletion error:', error);
      const errorMessage = error?.message || 'Failed to delete report';
      
      toast({ 
        title: 'Error deleting report', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    },
  });

  const updateReport = useMutation({
    mutationFn: async (data: { reportId: string; work_performed: string; materials_used?: string; hours_worked?: number; notes?: string }) => {
      const { data: result, error } = await supabase
        .from('work_order_reports')
        .update({
          work_performed: data.work_performed,
          materials_used: data.materials_used || null,
          hours_worked: data.hours_worked || null,
          notes: data.notes || null,
        })
        .eq('id', data.reportId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Report Updated",
        description: "Report details have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update report.",
        variant: "destructive",
      });
    },
  });

  return {
    reviewReport,
    bulkReviewReports,
    deleteReport,
    updateReport,
  };
}