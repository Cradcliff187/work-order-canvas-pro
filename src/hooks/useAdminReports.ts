import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'] & {
  work_orders: {
    work_order_number: string | null;
    title: string;
    organizations: { name: string } | null;
    trades: { name: string } | null;
    store_location: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    description: string | null;
  } | null;
  subcontractor: {
    first_name: string;
    last_name: string;
    company_name: string | null;
    email: string;
    phone: string | null;
  } | null;
  reviewed_by: {
    first_name: string;
    last_name: string;
  } | null;
};

interface ReportFilters {
  status?: string[];
  subcontractor_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface SortingState {
  id: string;
  desc: boolean;
}

export function useAdminReports(
  pagination: PaginationState,
  sorting: SortingState[],
  filters: ReportFilters
) {
  return useQuery({
    queryKey: ['admin-reports', pagination, sorting, filters],
    queryFn: async () => {
      let query = supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            work_order_number,
            title,
            organizations!organization_id(name)
          ),
          subcontractor:profiles!subcontractor_user_id(
            first_name,
            last_name,
            company_name
          ),
          reviewed_by:profiles!reviewed_by_user_id(
            first_name,
            last_name
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['report_status'][]);
      }
      if (filters.subcontractor_id) {
        query = query.eq('subcontractor_user_id', filters.subcontractor_id);
      }
      if (filters.date_from) {
        query = query.gte('submitted_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('submitted_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`work_performed.ilike.%${filters.search}%,notes.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`);
      }

      // Apply sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      } else {
        query = query.order('submitted_at', { ascending: false });
      }

      // Apply pagination
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data as WorkOrderReport[]) || [],
        totalCount: count || 0,
        pageCount: Math.ceil((count || 0) / pagination.pageSize)
      };
    },
  });
}

export function useAdminReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['admin-report-detail', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            *,
            organizations!organization_id(name),
            trades!trade_id(name)
          ),
          subcontractor:profiles!subcontractor_user_id(
            first_name,
            last_name,
            company_name,
            email,
            phone
          ),
          reviewed_by:profiles!reviewed_by_user_id(
            first_name,
            last_name
          ),
          work_order_attachments!work_order_report_id(
            id,
            file_name,
            file_url,
            file_type,
            uploaded_at
          )
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return data as WorkOrderReport & {
        work_order_attachments: Array<{
          id: string;
          file_name: string;
          file_url: string;
          file_type: string;
          uploaded_at: string;
        }>;
      };
    },
    enabled: !!reportId,
  });
}

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
            completed_at: new Date().toISOString()
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

      // Trigger email notification
      supabase.functions.invoke('email-report-reviewed', {
        body: { 
          reportId: variables.reportId,
          status: variables.status,
          reviewNotes: variables.reviewNotes
        }
      }).catch(error => {
        console.error('Failed to send email notification:', error);
      });
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
            completed_at: new Date().toISOString()
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

export function useSubcontractors() {
  return useQuery({
    queryKey: ['subcontractors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company_name')
        .eq('user_type', 'subcontractor')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });
}