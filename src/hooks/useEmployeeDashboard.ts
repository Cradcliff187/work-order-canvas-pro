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

// Fetch employee's active assignments
const fetchActiveAssignments = async (employeeId: string): Promise<EmployeeAssignment[]> => {
  const { data, error } = await supabase
    .from('work_order_assignments')
    .select(`
      id,
      assignment_type,
      assigned_at,
      work_orders!inner (
        id,
        title,
        work_order_number,
        status
      )
    `)
    .eq('assigned_to', employeeId)
    .in('work_orders.status', ['assigned', 'in_progress'])
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return data || [];
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

  // Active assignments
  const activeAssignmentsQuery = useQuery({
    queryKey: ['employee-active-assignments', employeeId],
    queryFn: () => fetchActiveAssignments(employeeId!),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Time reports for this week
  const hoursThisWeekQuery = useQuery({
    queryKey: ['employee-hours-this-week', employeeId, weekStart, weekEnd],
    queryFn: () => fetchTimeReports(employeeId!, weekStart, weekEnd),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Time reports for this month
  const hoursThisMonthQuery = useQuery({
    queryKey: ['employee-hours-this-month', employeeId, monthStart, monthEnd],
    queryFn: () => fetchTimeReports(employeeId!, monthStart, monthEnd),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Recent receipts
  const recentReceiptsQuery = useQuery({
    queryKey: ['employee-recent-receipts', employeeId],
    queryFn: () => fetchRecentReceipts(employeeId!),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Monthly expenses
  const monthlyExpensesQuery = useQuery({
    queryKey: ['employee-monthly-expenses', employeeId, monthStart, monthEnd],
    queryFn: () => fetchMonthlyExpenses(employeeId!, monthStart, monthEnd),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Pending time reports
  const pendingTimeReportsQuery = useQuery({
    queryKey: ['employee-pending-time-reports', employeeId],
    queryFn: () => fetchPendingTimeReports(employeeId!),
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  // Recent time reports (last 10)
  const recentTimeReportsQuery = useQuery({
    queryKey: ['employee-recent-time-reports', employeeId],
    queryFn: () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return fetchTimeReports(employeeId!, thirtyDaysAgo, now);
    },
    enabled: !!employeeId,
    refetchInterval: 30000,
  });

  const hoursThisWeek = hoursThisWeekQuery.data || [];
  const hoursThisMonth = hoursThisMonthQuery.data || [];
  const totalHoursThisWeek = getTotalHours(hoursThisWeek);
  const totalHoursThisMonth = getTotalHours(hoursThisMonth);

  return {
    activeAssignments: activeAssignmentsQuery.data,
    hoursThisWeek,
    hoursThisMonth,
    recentReceipts: recentReceiptsQuery.data,
    pendingTimeReports: pendingTimeReportsQuery.data,
    totalHoursThisWeek,
    totalHoursThisMonth,
    monthlyExpenses: monthlyExpensesQuery.data || 0,
    recentTimeReports: recentTimeReportsQuery.data,
    isLoading: 
      activeAssignmentsQuery.isLoading ||
      hoursThisWeekQuery.isLoading ||
      hoursThisMonthQuery.isLoading ||
      recentReceiptsQuery.isLoading ||
      pendingTimeReportsQuery.isLoading ||
      recentTimeReportsQuery.isLoading ||
      monthlyExpensesQuery.isLoading,
    isError: 
      activeAssignmentsQuery.isError ||
      hoursThisWeekQuery.isError ||
      hoursThisMonthQuery.isError ||
      recentReceiptsQuery.isError ||
      pendingTimeReportsQuery.isError ||
      recentTimeReportsQuery.isError ||
      monthlyExpensesQuery.isError,
  };
};