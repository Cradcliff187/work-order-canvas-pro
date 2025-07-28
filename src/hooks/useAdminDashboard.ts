import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetrics {
  totalWorkOrders: {
    current: number;
    lastMonth: number;
    trend: 'up' | 'down' | 'same';
  };
  pendingAssignments: number;
  overdueWorkOrders: number;
  completedThisMonth: number;
  pendingInvoices: number;
  pendingReports: number;
  unpaidApprovedInvoices: number;
  employeesOnDuty: number;
  activeSubcontractors: number;
  todayWorkOrders: number;
  recentPayments: Array<{
    id: string;
    internal_invoice_number: string;
    total_amount: number;
    paid_at: string;
    payment_reference: string | null;
    subcontractor_name: string;
  }>;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface DailySubmission {
  date: string;
  count: number;
}

interface TradeVolume {
  trade: string;
  count: number;
}

interface RecentWorkOrder {
  id: string;
  title: string;
  work_order_number: string;
  status: string;
  created_at: string;
  assigned_to_name?: string;
}

interface RecentReport {
  id: string;
  work_order_title: string;
  work_order_number: string;
  status: string;
  submitted_at: string;
  subcontractor_name: string;
}

// Fetch dashboard metrics
const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const currentDate = new Date();
  const firstDayCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const firstDayLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

  // Total work orders (current vs last month)
  const { data: currentMonthData } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact' })
    .gte('created_at', firstDayCurrentMonth.toISOString());

  const { data: lastMonthData } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact' })
    .gte('created_at', firstDayLastMonth.toISOString())
    .lt('created_at', firstDayCurrentMonth.toISOString());

  // Pending assignments
  const { count: pendingCount } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact' })
    .eq('status', 'received');

  // Today's new work orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { count: todayWorkOrdersCount } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact' })
    .gte('date_submitted', todayStart.toISOString());

  // Overdue work orders
  const { count: overdueCount } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact' })
    .lt('due_date', new Date().toISOString().split('T')[0])
    .not('status', 'in', '(completed,cancelled)');

  // Completed this month
  const { count: completedCount } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact' })
    .eq('status', 'completed')
    .gte('date_completed', firstDayCurrentMonth.toISOString());

  // Pending invoices
  const { count: pendingInvoicesCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact' })
    .eq('status', 'submitted');

  // Pending reports
  const { count: pendingReportsCount } = await supabase
    .from('work_order_reports')
    .select('id', { count: 'exact' })
    .eq('status', 'submitted');

  // Unpaid approved invoices
  const { count: unpaidApprovedCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact' })
    .eq('status', 'approved')
    .is('paid_at', null);

  // Employees on duty (employees with recent time reports)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const { data: activeEmployeesData } = await supabase
    .from('employee_reports')
    .select('employee_user_id')
    .gte('report_date', threeDaysAgo.toISOString().split('T')[0]);

  const uniqueActiveEmployees = new Set(
    (activeEmployeesData || []).map(report => report.employee_user_id)
  );

  // Recent payments (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentPaymentsData } = await supabase
    .from('invoices')
    .select(`
      id,
      internal_invoice_number,
      total_amount,
      paid_at,
      payment_reference,
      subcontractor_organization:subcontractor_organization_id (name)
    `)
    .eq('status', 'paid')
    .gte('paid_at', sevenDaysAgo.toISOString())
    .order('paid_at', { ascending: false })
    .limit(5);

  const recentPayments = (recentPaymentsData || []).map(payment => ({
    id: payment.id,
    internal_invoice_number: payment.internal_invoice_number,
    total_amount: payment.total_amount,
    paid_at: payment.paid_at!,
    payment_reference: payment.payment_reference,
    subcontractor_name: payment.subcontractor_organization?.name || 'Unknown'
  }));

  // Active subcontractors (with recent activity)
  const sevenDaysAgoSubcontractors = new Date();
  sevenDaysAgoSubcontractors.setDate(sevenDaysAgoSubcontractors.getDate() - 7);

  const { data: activeSubcontractors } = await supabase
    .from('work_order_assignments')
    .select('assigned_organization_id')
    .not('assigned_organization_id', 'is', null)
    .gte('assigned_at', sevenDaysAgoSubcontractors.toISOString());

  const uniqueSubcontractorOrgs = new Set(
    activeSubcontractors?.map(a => a.assigned_organization_id).filter(Boolean) || []
  );

  const currentTotal = currentMonthData?.length || 0;
  const lastMonthTotal = lastMonthData?.length || 0;
  
  let trend: 'up' | 'down' | 'same' = 'same';
  if (currentTotal > lastMonthTotal) trend = 'up';
  else if (currentTotal < lastMonthTotal) trend = 'down';

  return {
    totalWorkOrders: {
      current: currentTotal,
      lastMonth: lastMonthTotal,
      trend,
    },
    pendingAssignments: pendingCount || 0,
    overdueWorkOrders: overdueCount || 0,
    completedThisMonth: completedCount || 0,
    pendingInvoices: pendingInvoicesCount || 0,
    pendingReports: pendingReportsCount || 0,
    unpaidApprovedInvoices: unpaidApprovedCount || 0,
    employeesOnDuty: uniqueActiveEmployees.size,
    activeSubcontractors: uniqueSubcontractorOrgs.size,
    todayWorkOrders: todayWorkOrdersCount || 0,
    recentPayments,
  };
};

// Fetch status distribution for pie chart
const fetchStatusDistribution = async (): Promise<StatusDistribution[]> => {
  const { data } = await supabase
    .from('work_orders')
    .select('status');

  if (!data) return [];

  const statusCounts = data.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = data.length;
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    percentage: Math.round((count / total) * 100),
  }));
};

// Fetch daily submissions for line chart
const fetchDailySubmissions = async (): Promise<DailySubmission[]> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data } = await supabase
    .from('work_orders')
    .select('created_at')
    .gte('created_at', sevenDaysAgo.toISOString());

  if (!data) return [];

  const dailyCounts = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Fill in missing days with 0
  const result: DailySubmission[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      count: dailyCounts[dateStr] || 0,
    });
  }

  return result;
};

// Fetch trade volumes for bar chart
const fetchTradeVolumes = async (): Promise<TradeVolume[]> => {
  const { data } = await supabase
    .from('work_orders')
    .select(`
      trade_id,
      trades:trade_id (name)
    `);

  if (!data) return [];

  const tradeCounts = data.reduce((acc, item) => {
    const tradeName = item.trades?.name || 'Unassigned';
    acc[tradeName] = (acc[tradeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(tradeCounts)
    .map(([trade, count]) => ({ 
      id: `trade-${trade.toLowerCase().replace(/\s+/g, '-')}`, 
      trade, 
      count 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 trades
};

// Fetch recent work orders
const fetchRecentWorkOrders = async (): Promise<RecentWorkOrder[]> => {
  const { data } = await supabase
    .from('work_orders')
    .select(`
      id,
      title,
      work_order_number,
      status,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data) return [];

  // Fetch profile names separately for assigned users
  const workOrdersWithNames = await Promise.all(
    data.map(async (workOrder) => {
      let assigned_to_name: string | undefined;
      
      // Get assignment names from work_order_assignments
      const { data: assignments } = await supabase
        .from('work_order_assignments')
        .select(`
          profiles!work_order_assignments_assigned_to_fkey(first_name, last_name)
        `)
        .eq('work_order_id', workOrder.id)
        .limit(1);
      
      if (assignments?.[0]?.profiles) {
        const profile = assignments[0].profiles;
        assigned_to_name = `${profile.first_name} ${profile.last_name}`;
      }

      return {
        ...workOrder,
        assigned_to_name,
      };
    })
  );

  return workOrdersWithNames;
};

// Fetch recent reports
const fetchRecentReports = async (): Promise<RecentReport[]> => {
  const { data } = await supabase
    .from('work_order_reports')
    .select(`
      id,
      status,
      submitted_at,
      work_order_id,
      subcontractor_user_id
    `)
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (!data) return [];

  // Fetch work order and profile details separately
  const reportsWithDetails = await Promise.all(
    data.map(async (report) => {
      // Get work order details
      const { data: workOrder } = await supabase
        .from('work_orders')
        .select('title, work_order_number')
        .eq('id', report.work_order_id)
        .single();

      // Get subcontractor profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', report.subcontractor_user_id)
        .single();

      return {
        id: report.id,
        work_order_title: workOrder?.title || 'Unknown',
        work_order_number: workOrder?.work_order_number || 'N/A',
        status: report.status,
        submitted_at: report.submitted_at,
        subcontractor_name: profile 
          ? `${profile.first_name} ${profile.last_name}`
          : 'Unknown',
      };
    })
  );

  return reportsWithDetails;
};

export const useAdminDashboard = () => {
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Fetch dashboard metrics
  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch chart data
  const statusDistributionQuery = useQuery({
    queryKey: ['admin-dashboard-status-distribution'],
    queryFn: fetchStatusDistribution,
    refetchInterval: 30000,
  });

  const dailySubmissionsQuery = useQuery({
    queryKey: ['admin-dashboard-daily-submissions'],
    queryFn: fetchDailySubmissions,
    refetchInterval: 30000,
  });

  const tradeVolumesQuery = useQuery({
    queryKey: ['admin-dashboard-trade-volumes'],
    queryFn: fetchTradeVolumes,
    refetchInterval: 30000,
  });

  // Fetch recent activity
  const recentWorkOrdersQuery = useQuery({
    queryKey: ['admin-dashboard-recent-work-orders'],
    queryFn: fetchRecentWorkOrders,
    refetchInterval: 15000,
  });

  const recentReportsQuery = useQuery({
    queryKey: ['admin-dashboard-recent-reports'],
    queryFn: fetchRecentReports,
    refetchInterval: 15000,
  });

  // Real-time subscriptions
  useEffect(() => {
    const workOrdersChannel = supabase
      .channel('work-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
        },
        () => {
          // Refetch relevant queries on work order changes
          metricsQuery.refetch();
          statusDistributionQuery.refetch();
          dailySubmissionsQuery.refetch();
          tradeVolumesQuery.refetch();
          recentWorkOrdersQuery.refetch();
        }
      )
      .subscribe();

    const reportsChannel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_order_reports',
        },
        () => {
          recentReportsQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workOrdersChannel);
      supabase.removeChannel(reportsChannel);
    };
  }, []);

  return {
    metrics: metricsQuery.data,
    statusDistribution: statusDistributionQuery.data,
    dailySubmissions: dailySubmissionsQuery.data,
    tradeVolumes: tradeVolumesQuery.data,
    recentWorkOrders: recentWorkOrdersQuery.data,
    recentReports: recentReportsQuery.data,
    isLoading: 
      metricsQuery.isLoading ||
      statusDistributionQuery.isLoading ||
      dailySubmissionsQuery.isLoading ||
      tradeVolumesQuery.isLoading ||
      recentWorkOrdersQuery.isLoading ||
      recentReportsQuery.isLoading,
    isError: 
      metricsQuery.isError ||
      statusDistributionQuery.isError ||
      dailySubmissionsQuery.isError ||
      tradeVolumesQuery.isError ||
      recentWorkOrdersQuery.isError ||
      recentReportsQuery.isError,
  };
};