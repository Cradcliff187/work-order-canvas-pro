import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];

export interface ActivityItem {
  id: string;
  type: 'work_order_new' | 'work_order_status' | 'report_new' | 'invoice_status';
  title: string;
  description: string;
  timestamp: string;
  actionUrl: string;
}

const fetchActivityFeed = async (): Promise<ActivityItem[]> => {
  const activities: ActivityItem[] = [];

  // Fetch recent work orders (last 24 hours)
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select(`
      id,
      work_order_number,
      title,
      status,
      created_at,
      date_submitted,
      organizations!organization_id(name)
    `)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (workOrders) {
    workOrders.forEach((wo) => {
      activities.push({
        id: `wo_new_${wo.id}`,
        type: 'work_order_new',
        title: `New Work Order: ${wo.work_order_number}`,
        description: `${wo.title} - ${wo.organizations?.name || 'Unknown Organization'}`,
        timestamp: wo.created_at,
        actionUrl: `/admin/work-orders/${wo.id}`,
      });
    });
  }

  // Fetch recent work order reports (last 24 hours)
  const { data: reports } = await supabase
    .from('work_order_reports')
    .select(`
      id,
      work_performed,
      submitted_at,
      status,
      work_orders!work_order_id(
        work_order_number,
        organizations!organization_id(name)
      ),
      subcontractor:profiles!subcontractor_user_id(
        first_name,
        last_name,
        company_name
      )
    `)
    .gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('submitted_at', { ascending: false })
    .limit(10);

  if (reports) {
    reports.forEach((report) => {
      const organizationName = report.subcontractor?.company_name 
        || (report.subcontractor ? `${report.subcontractor.first_name} ${report.subcontractor.last_name}` : 'Unknown Organization');
      
      activities.push({
        id: `report_new_${report.id}`,
        type: 'report_new',
        title: `New Report: ${report.work_orders?.work_order_number}`,
        description: `Report submitted by ${organizationName} - ${report.work_orders?.organizations?.name || 'Unknown Organization'}`,
        timestamp: report.submitted_at || new Date().toISOString(),
        actionUrl: `/admin/reports`,
      });
    });
  }

  // Fetch recent invoice status changes (last 24 hours)
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      internal_invoice_number,
      external_invoice_number,
      status,
      total_amount,
      updated_at,
      subcontractor_organization:organizations!subcontractor_organization_id(name)
    `)
    .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(10);

  if (invoices) {
    invoices.forEach((invoice) => {
      activities.push({
        id: `invoice_status_${invoice.id}`,
        type: 'invoice_status',
        title: `Invoice ${invoice.internal_invoice_number}`,
        description: `Status: ${invoice.status} - $${invoice.total_amount || 0} - ${invoice.subcontractor_organization?.name || 'Unknown Organization'}`,
        timestamp: invoice.updated_at,
        actionUrl: `/admin/invoices/${invoice.id}`,
      });
    });
  }

  // Sort all activities by timestamp descending and limit to 20
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
};

export function useActivityFeed() {
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: fetchActivityFeed,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Subscribe to work_orders changes
    const workOrderChannel = supabase
      .channel('activity-work-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('New work order activity:', payload);
          queryClient.invalidateQueries({
            queryKey: ['activity-feed'],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('Work order status change:', payload);
          queryClient.invalidateQueries({
            queryKey: ['activity-feed'],
          });
        }
      )
      .subscribe();

    // Subscribe to work_order_reports changes
    const reportsChannel = supabase
      .channel('activity-reports')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_reports',
        },
        (payload) => {
          console.log('New report activity:', payload);
          queryClient.invalidateQueries({
            queryKey: ['activity-feed'],
          });
        }
      )
      .subscribe();

    // Subscribe to invoices status changes
    const invoicesChannel = supabase
      .channel('activity-invoices')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          console.log('Invoice status change:', payload);
          queryClient.invalidateQueries({
            queryKey: ['activity-feed'],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workOrderChannel);
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [queryClient]);

  return {
    activities,
    isLoading,
    error,
  };
}