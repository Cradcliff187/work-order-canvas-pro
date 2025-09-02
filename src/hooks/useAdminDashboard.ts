import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryPerformance } from '@/hooks/useQueryPerformance';
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
  workOrdersNeedingEstimates: number;
  estimatesNeedingMarkup: number;
  estimatesAwaitingApproval: number;
  recentPayments: Array<{
    id: string;
    internal_bill_number: string;
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
  const { count: currentMonthCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstDayCurrentMonth.toISOString());

  const { count: lastMonthCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstDayLastMonth.toISOString())
    .lt('created_at', firstDayCurrentMonth.toISOString());

  // Pending assignments
  const { count: pendingCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'received');

  // Today's new work orders
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { count: todayWorkOrdersCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .gte('date_submitted', todayStart.toISOString());

  // Overdue work orders
  const { count: overdueCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .lt('due_date', new Date().toISOString().split('T')[0])
    .not('status', 'in', '(completed,cancelled)');

  // Completed this month
  const { count: completedCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('date_completed', firstDayCurrentMonth.toISOString());

  // Pending invoices
  const { count: pendingInvoicesCount } = await supabase
    .from('subcontractor_bills')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  // Pending reports
  const { count: pendingReportsCount } = await supabase
    .from('work_order_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  // Unpaid approved invoices
  const { count: unpaidApprovedCount } = await supabase
    .from('subcontractor_bills')
    .select('*', { count: 'exact', head: true })
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
    .from('subcontractor_bills')
    .select(`
      id,
      internal_bill_number,
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
    internal_bill_number: payment.internal_bill_number,
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

  // Estimate pipeline metrics
  // Work orders assigned to subcontractors but missing subcontractor estimates
  const { count: needingEstimatesCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'assigned')
    .is('subcontractor_estimate_amount', null);

  // Work orders with subcontractor estimates but missing internal estimates
  const { count: needingMarkupCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .not('subcontractor_estimate_amount', 'is', null)
    .is('internal_estimate_amount', null);

  // Work orders with internal estimates but pending partner approval
  const { count: awaitingApprovalCount } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .not('internal_estimate_amount', 'is', null)
    .is('partner_estimate_approved', null);

  const currentTotal = currentMonthCount || 0;
  const lastMonthTotal = lastMonthCount || 0;
  
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
    workOrdersNeedingEstimates: needingEstimatesCount || 0,
    estimatesNeedingMarkup: needingMarkupCount || 0,
    estimatesAwaitingApproval: awaitingApprovalCount || 0,
    recentPayments,
  };
};

// Fetch status distribution for pie chart
const fetchStatusDistribution = async (): Promise<StatusDistribution[]> => {
  const statuses = ['received', 'assigned', 'in_progress', 'completed', 'cancelled'];

  const results = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', s as any);
      return { status: s, count: count || 0 };
    })
  );

  const total = results.reduce((sum, r) => sum + r.count, 0) || 1;

  return results.map(({ status, count }) => ({
    status: status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
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
      created_at,
      work_order_assignments:work_order_assignments!work_order_assignments_work_order_id_fkey (
        profiles:profiles!work_order_assignments_assigned_to_fkey ( first_name, last_name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)
    .limit(1, { foreignTable: 'work_order_assignments' });

  if (!data) return [];

  return (data as any[]).map((wo) => {
    const assigneeProfile = wo.work_order_assignments?.[0]?.profiles;
    const assigned_to_name = assigneeProfile
      ? `${assigneeProfile.first_name} ${assigneeProfile.last_name}`
      : undefined;

    return {
      id: wo.id,
      title: wo.title,
      work_order_number: wo.work_order_number,
      status: wo.status,
      created_at: wo.created_at,
      assigned_to_name,
    } as RecentWorkOrder;
  });
};

// Fetch recent reports
const fetchRecentReports = async (): Promise<RecentReport[]> => {
  const { data } = await supabase
    .from('work_order_reports')
    .select(`
      id,
      status,
      submitted_at,
      work_orders:work_order_id ( title, work_order_number ),
      subcontractor:subcontractor_user_id ( first_name, last_name )
    `)
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (!data) return [];

  return (data as any[]).map((r) => ({
    id: r.id,
    work_order_title: r.work_orders?.title || 'Unknown',
    work_order_number: r.work_orders?.work_order_number || 'N/A',
    status: r.status,
    submitted_at: r.submitted_at,
    subcontractor_name: r.subcontractor
      ? `${r.subcontractor.first_name} ${r.subcontractor.last_name}`
      : 'Unknown',
  }));
};

export const useAdminDashboard = () => {
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Fetch dashboard metrics
  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  // Fetch chart data
  const statusDistributionQuery = useQuery({
    queryKey: ['admin-dashboard-status-distribution'],
    queryFn: fetchStatusDistribution,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const dailySubmissionsQuery = useQuery({
    queryKey: ['admin-dashboard-daily-submissions'],
    queryFn: fetchDailySubmissions,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const tradeVolumesQuery = useQuery({
    queryKey: ['admin-dashboard-trade-volumes'],
    queryFn: fetchTradeVolumes,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  // Fetch recent activity
  const recentWorkOrdersQuery = useQuery({
    queryKey: ['admin-dashboard-recent-work-orders'],
    queryFn: fetchRecentWorkOrders,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const recentReportsQuery = useQuery({
    queryKey: ['admin-dashboard-recent-reports'],
    queryFn: fetchRecentReports,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  // Instrumentation for performance
  useQueryPerformance(['admin-dashboard-metrics'], metricsQuery.isLoading, (metricsQuery as any).error, metricsQuery.data);
  useQueryPerformance(['admin-dashboard-status-distribution'], statusDistributionQuery.isLoading, (statusDistributionQuery as any).error, statusDistributionQuery.data);
  useQueryPerformance(['admin-dashboard-daily-submissions'], dailySubmissionsQuery.isLoading, (dailySubmissionsQuery as any).error, dailySubmissionsQuery.data);
  useQueryPerformance(['admin-dashboard-trade-volumes'], tradeVolumesQuery.isLoading, (tradeVolumesQuery as any).error, tradeVolumesQuery.data);
  useQueryPerformance(['admin-dashboard-recent-work-orders'], recentWorkOrdersQuery.isLoading, (recentWorkOrdersQuery as any).error, recentWorkOrdersQuery.data);
  useQueryPerformance(['admin-dashboard-recent-reports'], recentReportsQuery.isLoading, (recentReportsQuery as any).error, recentReportsQuery.data);

  useEffect(() => {
    let timer: number | null = null;

    const schedule = (cb: () => void, delay = 750) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        cb();
        timer = null;
      }, delay);
    };

    const invalidateForTable = (table: string) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[useAdminDashboard] change detected:', table);
      }
      schedule(() => {
        if (table === 'work_orders') {
          metricsQuery.refetch();
          statusDistributionQuery.refetch();
          dailySubmissionsQuery.refetch();
          tradeVolumesQuery.refetch();
          recentWorkOrdersQuery.refetch();
        } else if (table === 'work_order_reports') {
          recentReportsQuery.refetch();
          metricsQuery.refetch();
        } else if (table === 'subcontractor_bills') {
          metricsQuery.refetch();
        }
      }, 750);
    };

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => invalidateForTable('work_orders'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_reports' }, () => invalidateForTable('work_order_reports'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcontractor_bills' }, () => invalidateForTable('subcontractor_bills'))
      .subscribe();

    return () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      supabase.removeChannel(channel);
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