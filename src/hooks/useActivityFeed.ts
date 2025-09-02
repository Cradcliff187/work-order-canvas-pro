import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'];
type SubcontractorBill = Database['public']['Tables']['subcontractor_bills']['Row'];

export interface ActivityItem {
  id: string;
  type: 'work_order_new' | 'work_order_status' | 'report_new' | 'subcontractor_bill_status';
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
        last_name
      )
    `)
    .gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('submitted_at', { ascending: false })
    .limit(10);

  if (reports) {
    reports.forEach((report) => {
      const organizationName = report.subcontractor ? `${report.subcontractor.first_name} ${report.subcontractor.last_name}` : 'Unknown Organization';
      
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

  // Fetch recent subcontractor bill status changes (last 24 hours)
  const { data: subcontractorBills } = await supabase
    .from('subcontractor_bills')
    .select(`
      id,
      internal_bill_number,
      external_bill_number,
      status,
      total_amount,
      updated_at,
      subcontractor_organization:organizations!subcontractor_organization_id(name)
    `)
    .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(10);

  if (subcontractorBills) {
    subcontractorBills.forEach((bill) => {
      activities.push({
        id: `subcontractor_bill_status_${bill.id}`,
        type: 'subcontractor_bill_status',
        title: `Bill ${bill.internal_bill_number}`,
        description: `Status: ${bill.status} - $${bill.total_amount || 0} - ${bill.subcontractor_organization?.name || 'Unknown Organization'}`,
        timestamp: bill.updated_at,
        actionUrl: `/admin/invoices/${bill.id}`,
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
    const queryKey = ['activity-feed'];

    // Debounced invalidation to prevent refetch storms
    let timer: number | null = null;
    const debouncedInvalidate = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        timer = null;
      }, 1000);
    };

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'work_orders' },
        () => debouncedInvalidate()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'work_orders' },
        () => debouncedInvalidate()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'work_order_reports' },
        () => debouncedInvalidate()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'subcontractor_bills' },
        () => debouncedInvalidate()
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[useActivityFeed] realtime status:', status);
        }
      });

    return () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    activities,
    isLoading,
    error,
  };
}