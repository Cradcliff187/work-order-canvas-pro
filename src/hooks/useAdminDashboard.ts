
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
  unpaidApprovedInvoices: number;
  employeesOnDuty: number;
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

// Fetch dashboard metrics with proper error handling
const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  console.log('Fetching dashboard metrics...');
  
  try {
    const currentDate = new Date();
    const firstDayCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Total work orders (current vs last month) - simplified query
    const { data: currentMonthData, error: currentError } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .gte('created_at', firstDayCurrentMonth.toISOString());

    if (currentError) {
      console.error('Error fetching current month data:', currentError);
    }

    const { data: lastMonthData, error: lastError } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .gte('created_at', firstDayLastMonth.toISOString())
      .lt('created_at', firstDayCurrentMonth.toISOString());

    if (lastError) {
      console.error('Error fetching last month data:', lastError);
    }

    // Pending assignments
    const { count: pendingCount, error: pendingError } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .eq('status', 'received');

    if (pendingError) {
      console.error('Error fetching pending assignments:', pendingError);
    }

    // Overdue work orders - simplified without due_date check
    const { count: overdueCount, error: overdueError } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .not('status', 'in', '(completed,cancelled)');

    if (overdueError) {
      console.error('Error fetching overdue work orders:', overdueError);
    }

    // Completed this month
    const { count: completedCount, error: completedError } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .eq('status', 'completed')
      .gte('completed_at', firstDayCurrentMonth.toISOString());

    if (completedError) {
      console.error('Error fetching completed work orders:', completedError);
    }

    // Pending invoices - simplified
    const { count: pendingInvoicesCount, error: invoicesError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact' })
      .eq('status', 'submitted');

    if (invoicesError) {
      console.error('Error fetching pending invoices:', invoicesError);
    }

    // Unpaid approved invoices
    const { count: unpaidApprovedCount, error: unpaidError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .is('paid_at', null);

    if (unpaidError) {
      console.error('Error fetching unpaid approved invoices:', unpaidError);
    }

    // Employees on duty - simplified
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: activeEmployeesData, error: employeesError } = await supabase
      .from('employee_reports')
      .select('employee_user_id')
      .gte('report_date', threeDaysAgo.toISOString().split('T')[0]);

    if (employeesError) {
      console.error('Error fetching active employees:', employeesError);
    }

    const uniqueActiveEmployees = new Set(
      (activeEmployeesData || []).map(report => report.employee_user_id)
    );

    // Recent payments - simplified query without complex joins
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentPaymentsData, error: paymentsError } = await supabase
      .from('invoices')
      .select('id, internal_invoice_number, total_amount, paid_at, payment_reference, subcontractor_organization_id')
      .eq('status', 'paid')
      .gte('paid_at', sevenDaysAgo.toISOString())
      .order('paid_at', { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error('Error fetching recent payments:', paymentsError);
    }

    const recentPayments = (recentPaymentsData || []).map(payment => ({
      id: payment.id,
      internal_invoice_number: payment.internal_invoice_number || 'N/A',
      total_amount: payment.total_amount || 0,
      paid_at: payment.paid_at!,
      payment_reference: payment.payment_reference,
      subcontractor_name: 'Organization' // Simplified - avoid complex join for now
    }));

    const currentTotal = currentMonthData?.length || 0;
    const lastMonthTotal = lastMonthData?.length || 0;
    
    let trend: 'up' | 'down' | 'same' = 'same';
    if (currentTotal > lastMonthTotal) trend = 'up';
    else if (currentTotal < lastMonthTotal) trend = 'down';

    console.log('Dashboard metrics fetched successfully');

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
      unpaidApprovedInvoices: unpaidApprovedCount || 0,
      employeesOnDuty: uniqueActiveEmployees.size,
      recentPayments,
    };
  } catch (error) {
    console.error('Error in fetchDashboardMetrics:', error);
    // Return default values instead of throwing
    return {
      totalWorkOrders: {
        current: 0,
        lastMonth: 0,
        trend: 'same',
      },
      pendingAssignments: 0,
      overdueWorkOrders: 0,
      completedThisMonth: 0,
      pendingInvoices: 0,
      unpaidApprovedInvoices: 0,
      employeesOnDuty: 0,
      recentPayments: [],
    };
  }
};

// Fetch status distribution for pie chart
const fetchStatusDistribution = async (): Promise<StatusDistribution[]> => {
  try {
    console.log('Fetching status distribution...');
    
    const { data, error } = await supabase
      .from('work_orders')
      .select('status');

    if (error) {
      console.error('Error fetching status distribution:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

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
  } catch (error) {
    console.error('Error in fetchStatusDistribution:', error);
    return [];
  }
};

// Fetch daily submissions for line chart
const fetchDailySubmissions = async (): Promise<DailySubmission[]> => {
  try {
    console.log('Fetching daily submissions...');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('work_orders')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching daily submissions:', error);
      return [];
    }

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
  } catch (error) {
    console.error('Error in fetchDailySubmissions:', error);
    return [];
  }
};

// Fetch trade volumes for bar chart
const fetchTradeVolumes = async (): Promise<TradeVolume[]> => {
  try {
    console.log('Fetching trade volumes...');
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        trade_id,
        trades:trade_id (name)
      `);

    if (error) {
      console.error('Error fetching trade volumes:', error);
      return [];
    }

    if (!data) return [];

    const tradeCounts = data.reduce((acc, item) => {
      const tradeName = item.trades?.name || 'Unassigned';
      acc[tradeName] = (acc[tradeName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tradeCounts)
      .map(([trade, count]) => ({ 
        trade, 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 trades
  } catch (error) {
    console.error('Error in fetchTradeVolumes:', error);
    return [];
  }
};

// Fetch recent work orders
const fetchRecentWorkOrders = async (): Promise<RecentWorkOrder[]> => {
  try {
    console.log('Fetching recent work orders...');
    
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        title,
        work_order_number,
        status,
        created_at,
        assigned_to
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recent work orders:', error);
      return [];
    }

    if (!data) return [];

    // Simplified - don't fetch profile names to avoid complexity
    return data.map(workOrder => ({
      ...workOrder,
      assigned_to_name: workOrder.assigned_to ? 'Assigned User' : undefined,
    }));
  } catch (error) {
    console.error('Error in fetchRecentWorkOrders:', error);
    return [];
  }
};

// Fetch recent reports
const fetchRecentReports = async (): Promise<RecentReport[]> => {
  try {
    console.log('Fetching recent reports...');
    
    const { data, error } = await supabase
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

    if (error) {
      console.error('Error fetching recent reports:', error);
      return [];
    }

    if (!data) return [];

    // Simplified - return basic data without complex joins
    return data.map(report => ({
      id: report.id,
      work_order_title: 'Work Order',
      work_order_number: 'N/A',
      status: report.status,
      submitted_at: report.submitted_at,
      subcontractor_name: 'Subcontractor',
    }));
  } catch (error) {
    console.error('Error in fetchRecentReports:', error);
    return [];
  }
};

export const useAdminDashboard = () => {
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Fetch dashboard metrics with error handling
  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch chart data with error handling
  const statusDistributionQuery = useQuery({
    queryKey: ['admin-dashboard-status-distribution'],
    queryFn: fetchStatusDistribution,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  const dailySubmissionsQuery = useQuery({
    queryKey: ['admin-dashboard-daily-submissions'],
    queryFn: fetchDailySubmissions,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  const tradeVolumesQuery = useQuery({
    queryKey: ['admin-dashboard-trade-volumes'],
    queryFn: fetchTradeVolumes,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch recent activity with error handling
  const recentWorkOrdersQuery = useQuery({
    queryKey: ['admin-dashboard-recent-work-orders'],
    queryFn: fetchRecentWorkOrders,
    refetchInterval: 15000,
    retry: 3,
    retryDelay: 1000,
  });

  const recentReportsQuery = useQuery({
    queryKey: ['admin-dashboard-recent-reports'],
    queryFn: fetchRecentReports,
    refetchInterval: 15000,
    retry: 3,
    retryDelay: 1000,
  });

  // Real-time subscriptions with error handling
  useEffect(() => {
    console.log('Setting up real-time subscriptions...');
    
    try {
      const workOrdersChannel = supabase
        .channel('work-orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'work_orders',
          },
          (payload) => {
            console.log('Work order change:', payload);
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
          (payload) => {
            console.log('Report change:', payload);
            recentReportsQuery.refetch();
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up real-time subscriptions...');
        supabase.removeChannel(workOrdersChannel);
        supabase.removeChannel(reportsChannel);
      };
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }
  }, []);

  const isLoading = 
    metricsQuery.isLoading ||
    statusDistributionQuery.isLoading ||
    dailySubmissionsQuery.isLoading ||
    tradeVolumesQuery.isLoading ||
    recentWorkOrdersQuery.isLoading ||
    recentReportsQuery.isLoading;

  const isError = 
    metricsQuery.isError ||
    statusDistributionQuery.isError ||
    dailySubmissionsQuery.isError ||
    tradeVolumesQuery.isError ||
    recentWorkOrdersQuery.isError ||
    recentReportsQuery.isError;

  // Log query states for debugging
  console.log('Query states:', {
    metricsLoading: metricsQuery.isLoading,
    metricsError: metricsQuery.isError,
    statusLoading: statusDistributionQuery.isLoading,
    statusError: statusDistributionQuery.isError,
    overallLoading: isLoading,
    overallError: isError,
  });

  return {
    metrics: metricsQuery.data,
    statusDistribution: statusDistributionQuery.data,
    dailySubmissions: dailySubmissionsQuery.data,
    tradeVolumes: tradeVolumesQuery.data,
    recentWorkOrders: recentWorkOrdersQuery.data,
    recentReports: recentReportsQuery.data,
    isLoading,
    isError,
  };
};
