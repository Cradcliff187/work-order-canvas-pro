
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface KPIMetrics {
  totalWorkOrders: number;
  monthOverMonth: number;
  avgCompletionTime: number;
  completionTimeTrend: number;
  firstTimeFixRate: number;
  totalInvoiceValue: number;
  activeSubcontractors: number;
  customerSatisfaction: number;
}

export interface ChartData {
  workOrderTrends: Array<{
    date: string;
    received: number;
    assigned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }>;
  tradePerformance: Array<{
    tradeName: string;
    avgCompletionHours: number;
    totalOrders: number;
    completedOrders: number;
  }>;
  organizationAnalysis: Array<{
    organizationName: string;
    totalOrders: number;
    completionRate: number;
    avgTurnaroundTime: number;
  }>;
  subcontractorPerformance: Array<{
    id: string;
    name: string;
    company: string;
    totalJobs: number;
    completedJobs: number;
    onTimeRate: number;
    onTimePercentage: number;
    reportApprovalRate: number;
  }>;
  geographicDistribution: Array<{
    state: string;
    city: string;
    workOrderCount: number;
    avgCompletionHours: number;
  }>;
}

export const useAnalytics = (dateRange: DateRange) => {
  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  // KPI Metrics Query
  const { data: kpiMetrics, isLoading: kpiLoading } = useQuery({
    queryKey: ['analytics', 'kpi', startDate, endDate],
    queryFn: async (): Promise<KPIMetrics> => {
      // Get current period stats
      const { data: currentPeriod } = await supabase
        .from('work_orders')
        .select('id, status, subcontractor_invoice_amount, completed_at, date_assigned')
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate);

      // Get previous period for comparison
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const prevStartDate = format(subDays(dateRange.from, daysDiff), 'yyyy-MM-dd');
      const prevEndDate = format(subDays(dateRange.to, daysDiff), 'yyyy-MM-dd');
      
      const { data: previousPeriod } = await supabase
        .from('work_orders')
        .select('id, status, completed_at, date_assigned')
        .gte('date_submitted', prevStartDate)
        .lte('date_submitted', prevEndDate);

      // Get first-time fix rate
      const { data: fixRateData } = await supabase.rpc('calculate_first_time_fix_rate', {
        start_date: startDate,
        end_date: endDate
      });

      // Get active subcontractors
      const { data: activeSubcontractors } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'subcontractor')
        .eq('is_active', true);

      // Calculate metrics
      const totalWorkOrders = currentPeriod?.length || 0;
      const previousTotal = previousPeriod?.length || 0;
      const monthOverMonth = previousTotal > 0 ? ((totalWorkOrders - previousTotal) / previousTotal) * 100 : 0;

      const completedOrders = currentPeriod?.filter(wo => wo.completed_at && wo.date_assigned) || [];
      const avgCompletionTime = completedOrders.length > 0 
        ? completedOrders.reduce((acc, wo) => {
            const hours = (new Date(wo.completed_at!).getTime() - new Date(wo.date_assigned!).getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }, 0) / completedOrders.length
        : 0;

      const totalInvoiceValue = currentPeriod?.reduce((sum, wo) => sum + (wo.subcontractor_invoice_amount || 0), 0) || 0;

      return {
        totalWorkOrders,
        monthOverMonth,
        avgCompletionTime,
        completionTimeTrend: 0, // TODO: Calculate trend
        firstTimeFixRate: fixRateData || 0,
        totalInvoiceValue,
        activeSubcontractors: activeSubcontractors?.length || 0,
        customerSatisfaction: 85, // Placeholder - can be calculated from report approvals
      };
    },
  });

  // Chart Data Query
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['analytics', 'charts', startDate, endDate],
    queryFn: async (): Promise<ChartData> => {
      // Work Order Trends
      const { data: trendsData } = await supabase
        .from('mv_work_order_analytics')
        .select('*')
        .gte('submission_date', startDate)
        .lte('submission_date', endDate)
        .order('submission_date');

      // Trade Performance
      const { data: tradeData } = await supabase.rpc('calculate_completion_time_by_trade', {
        start_date: startDate,
        end_date: endDate
      });

      // Organization Analysis - Fix the ambiguous relationship
      const { data: orgData } = await supabase
        .from('work_orders')
        .select(`
          organization_id,
          status,
          completed_at,
          date_assigned,
          organizations!organization_id(name)
        `)
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate);

      // Subcontractor Performance
      const { data: subcontractorData } = await supabase
        .from('mv_subcontractor_performance')
        .select('*');

      // Geographic Distribution
      const { data: geoData } = await supabase.rpc('get_geographic_distribution', {
        start_date: startDate,
        end_date: endDate
      });

      // Transform data for charts
      const workOrderTrends = trendsData?.map(d => ({
        date: format(new Date(d.submission_date), 'MMM dd'),
        received: d.received_count,
        assigned: d.assigned_count,
        inProgress: d.in_progress_count,
        completed: d.completed_count,
        cancelled: d.cancelled_count,
      })) || [];

      const tradePerformance = tradeData?.map(t => ({
        tradeName: t.trade_name,
        avgCompletionHours: Number(t.avg_completion_hours) || 0,
        totalOrders: Number(t.total_orders) || 0,
        completedOrders: Number(t.completed_orders) || 0,
      })) || [];

      // Group organization data
      const orgGroups = orgData?.reduce((acc, wo) => {
        const orgName = wo.organizations?.name || 'Unknown';
        if (!acc[orgName]) {
          acc[orgName] = { total: 0, completed: 0, totalTime: 0, completedCount: 0 };
        }
        acc[orgName].total++;
        if (wo.status === 'completed') {
          acc[orgName].completed++;
          if (wo.completed_at && wo.date_assigned) {
            const hours = (new Date(wo.completed_at).getTime() - new Date(wo.date_assigned).getTime()) / (1000 * 60 * 60);
            acc[orgName].totalTime += hours;
            acc[orgName].completedCount++;
          }
        }
        return acc;
      }, {} as Record<string, any>) || {};

      const organizationAnalysis = Object.entries(orgGroups).map(([name, data]) => ({
        organizationName: name,
        totalOrders: data.total,
        completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        avgTurnaroundTime: data.completedCount > 0 ? data.totalTime / data.completedCount : 0,
      }));

      const subcontractorPerformance = subcontractorData?.map(s => ({
        id: s.subcontractor_id,
        name: `${s.first_name} ${s.last_name}`,
        company: s.company_name || 'N/A',
        totalJobs: s.total_jobs || 0,
        completedJobs: s.completed_jobs || 0,
        onTimeRate: s.total_jobs > 0 ? ((s.on_time_jobs || 0) / s.total_jobs) * 100 : 0,
        onTimePercentage: Number(s.on_time_percentage) || 0,
        reportApprovalRate: Number(s.report_approval_rate) || 0,
      })) || [];

      const geographicDistribution = geoData?.map(g => ({
        state: g.state,
        city: g.city,
        workOrderCount: Number(g.work_order_count),
        avgCompletionHours: Number(g.avg_completion_hours) || 0,
      })) || [];

      return {
        workOrderTrends,
        tradePerformance,
        organizationAnalysis,
        subcontractorPerformance,
        geographicDistribution,
      };
    },
  });

  return {
    kpiMetrics,
    chartData,
    isLoading: kpiLoading || chartLoading,
  };
};

export const useRefreshAnalytics = () => {
  return useQuery({
    queryKey: ['analytics', 'refresh'],
    queryFn: async () => {
      const { error } = await supabase.rpc('refresh_analytics_views');
      if (error) throw error;
      return true;
    },
    enabled: false, // Only run when manually triggered
  });
};
