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
      // Add timeout wrapper for the entire operation
      return Promise.race([
        performReportReview({ reportId, status, reviewNotes }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out after 25 seconds')), 25000)
        )
      ]);
    },
    onSuccess: (data, variables) => {
      // Staggered query invalidation to prevent race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      }, 50);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-report-detail'] });
      }, 100);
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      }, 150);
      
      toast({ 
        title: `Report ${variables.status}`, 
        description: `The report has been ${variables.status} successfully.` 
      });
    },
    onError: (error: any) => {
      console.error('Report review mutation error:', error);
      const errorMessage = error?.message || 'Unknown error occurred while reviewing report';
      
      toast({ 
        title: 'Error reviewing report', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    },
    retry: (failureCount, error) => {
      // Don't retry timeout errors or user not found errors
      if (error?.message?.includes('timed out') || error?.message?.includes('User not found')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Extracted mutation logic for better error handling and testability
  const performReportReview = async ({ 
    reportId, 
    status, 
    reviewNotes 
  }: { 
    reportId: string; 
    status: 'approved' | 'rejected'; 
    reviewNotes?: string;
  }) => {
    // Get current user with better error handling
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse.user) {
      throw new Error('Authentication failed. Please refresh and try again.');
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userResponse.user.id)
      .single();

    if (profileError || !currentUser) {
      throw new Error('User profile not found. Please contact support.');
    }

    // Perform manual report review operations
    return performManualReportReview({ reportId, status, reviewNotes, currentUser });
  };

  // Fallback manual operations
  const performManualReportReview = async ({ 
    reportId, 
    status, 
    reviewNotes, 
    currentUser 
  }: any) => {
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
        // Don't throw here - the report review succeeded
      }
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