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
  recentTimeReports: EmployeeTimeReport[];
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


export const useEmployeeDashboard = () => {
  const { profile } = useAuth();
  const employeeId = profile?.id;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Single optimized RPC call for all dashboard data
  const dashboardDataQuery = useQuery({
    queryKey: ['employee-dashboard-data', employeeId, weekStart, weekEnd, monthStart, monthEnd],
    queryFn: async () => {
      if (!employeeId) return null;
      return await fetchEmployeeDashboardData(employeeId, weekStart, weekEnd, monthStart, monthEnd);
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });

  const dashboardData = dashboardDataQuery.data;

  return {
    activeAssignments: dashboardData?.activeAssignments,
    hoursThisWeek: dashboardData?.hoursThisWeek || [],
    hoursThisMonth: dashboardData?.hoursThisMonth || [],
    recentTimeReports: dashboardData?.recentTimeReports || [],
    recentReceipts: dashboardData?.recentReceipts,
    pendingTimeReports: dashboardData?.pendingTimeReports,
    totalHoursThisWeek: dashboardData?.totalHoursThisWeek || 0,
    totalHoursThisMonth: dashboardData?.totalHoursThisMonth || 0,
    monthlyExpenses: dashboardData?.monthlyExpenses || 0,
    isLoading: dashboardDataQuery.isLoading,
    isError: dashboardDataQuery.isError,
  };
};