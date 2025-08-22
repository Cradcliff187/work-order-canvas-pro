import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface EmployeeAssignment {
  id: string;
  assignment_type: string;
  assigned_at: string;
  work_orders: {
    id: string;
    title: string;
    work_order_number: string;
    status: string;
  } | null;
}

interface EmployeeTimeReport {
  id: string;
  report_date: string;
  hours_worked: number;
  hourly_rate_snapshot: number;
  work_performed: string;
  work_orders: {
    work_order_number: string;
  } | null;
}

interface EmployeeReceipt {
  id: string;
  vendor_name: string;
  amount: number;
  receipt_date: string;
  description: string;
}

interface DashboardData {
  activeAssignments: EmployeeAssignment[];
  hoursThisWeek: EmployeeTimeReport[];
  hoursThisMonth: EmployeeTimeReport[];
  recentReceipts: EmployeeReceipt[];
  monthlyExpenses: number;
  pendingTimeReports: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
}

// Call the optimized RPC function
const fetchEmployeeDashboardData = async (
  employeeId: string,
  weekStart: Date,
  weekEnd: Date,
  monthStart: Date,
  monthEnd: Date
): Promise<DashboardData> => {
  const { data, error } = await supabase.rpc('get_employee_dashboard_data', {
    p_employee_id: employeeId,
    p_week_start: format(weekStart, 'yyyy-MM-dd'),
    p_week_end: format(weekEnd, 'yyyy-MM-dd'),
    p_month_start: format(monthStart, 'yyyy-MM-dd'),
    p_month_end: format(monthEnd, 'yyyy-MM-dd')
  });

  if (error) throw error;
  return data as unknown as DashboardData;
};

// Fetch employee's time reports for a date range
const fetchTimeReports = async (employeeId: string, startDate: Date, endDate: Date): Promise<EmployeeTimeReport[]> => {
  const { data, error } = await supabase
    .from('employee_reports')
    .select(`
      id,
      report_date,
      hours_worked,
      hourly_rate_snapshot,
      work_performed,
      work_orders!inner (
        work_order_number
      )
    `)
    .eq('employee_user_id', employeeId)
    .gte('report_date', format(startDate, 'yyyy-MM-dd'))
    .lte('report_date', format(endDate, 'yyyy-MM-dd'))
    .order('report_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Fetch employee's recent receipts
const fetchRecentReceipts = async (employeeId: string): Promise<EmployeeReceipt[]> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('id, vendor_name, amount, receipt_date, description')
    .eq('employee_user_id', employeeId)
    .order('receipt_date', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
};

// Fetch employee's monthly expenses total
const fetchMonthlyExpenses = async (employeeId: string, startDate: Date, endDate: Date): Promise<number> => {
  const { data, error } = await supabase
    .from('receipts')
    .select('amount')
    .eq('employee_user_id', employeeId)
    .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
    .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;
  return (data || []).reduce((total, receipt) => total + receipt.amount, 0);
};

// Get total hours for a date range
const getTotalHours = (timeReports: EmployeeTimeReport[]): number => {
  return timeReports.reduce((total, report) => total + report.hours_worked, 0);
};

// Count pending time reports (work orders that need time reports)
const fetchPendingTimeReports = async (employeeId: string): Promise<number> => {
  // Get active assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('work_order_assignments')
    .select('work_order_id')
    .eq('assigned_to', employeeId);

  if (assignmentsError) throw assignmentsError;

  if (!assignments || assignments.length === 0) return 0;

  const workOrderIds = assignments.map(a => a.work_order_id);

  // Check which work orders don't have recent time reports
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: recentReports, error: reportsError } = await supabase
    .from('employee_reports')
    .select('work_order_id')
    .eq('employee_user_id', employeeId)
    .in('work_order_id', workOrderIds)
    .gte('report_date', format(oneWeekAgo, 'yyyy-MM-dd'));

  if (reportsError) throw reportsError;

  const reportedWorkOrderIds = new Set((recentReports || []).map(r => r.work_order_id));
  return workOrderIds.filter(id => !reportedWorkOrderIds.has(id)).length;
};

export const useEmployeeDashboard = () => {
  const { profile } = useAuth();
  const employeeId = profile?.id;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Optimized dashboard data query - single RPC call
  const dashboardDataQuery = useQuery({
    queryKey: ['employee-dashboard-data', employeeId, weekStart, weekEnd, monthStart, monthEnd],
    queryFn: async () => {
      if (!employeeId) return null;
      
      // Single optimized RPC call instead of 6 parallel queries
      return await fetchEmployeeDashboardData(employeeId, weekStart, weekEnd, monthStart, monthEnd);
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });

  // Recent time reports (separate query as it's less critical)
  const recentTimeReportsQuery = useQuery({
    queryKey: ['employee-recent-time-reports', employeeId],
    queryFn: () => {
      if (!employeeId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return fetchTimeReports(employeeId, thirtyDaysAgo, now);
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const dashboardData = dashboardDataQuery.data;

  return {
    activeAssignments: dashboardData?.activeAssignments,
    hoursThisWeek: dashboardData?.hoursThisWeek || [],
    hoursThisMonth: dashboardData?.hoursThisMonth || [],
    recentReceipts: dashboardData?.recentReceipts,
    pendingTimeReports: dashboardData?.pendingTimeReports,
    totalHoursThisWeek: dashboardData?.totalHoursThisWeek || 0,
    totalHoursThisMonth: dashboardData?.totalHoursThisMonth || 0,
    monthlyExpenses: dashboardData?.monthlyExpenses || 0,
    recentTimeReports: recentTimeReportsQuery.data,
    isLoading: dashboardDataQuery.isLoading || recentTimeReportsQuery.isLoading,
    isError: dashboardDataQuery.isError || recentTimeReportsQuery.isError,
  };
};