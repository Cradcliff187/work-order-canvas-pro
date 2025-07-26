
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
        .select('id, status, actual_completion_date, date_assigned')
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate);

      // Get previous period for comparison
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const prevStartDate = format(subDays(dateRange.from, daysDiff), 'yyyy-MM-dd');
      const prevEndDate = format(subDays(dateRange.to, daysDiff), 'yyyy-MM-dd');
      
      const { data: previousPeriod } = await supabase
        .from('work_orders')
        .select('id, status, actual_completion_date, date_assigned')
        .gte('date_submitted', prevStartDate)
        .lte('date_submitted', prevEndDate);

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

      const completedOrders = currentPeriod?.filter(wo => wo.actual_completion_date && wo.date_assigned) || [];
      const avgCompletionTime = completedOrders.length > 0 
        ? completedOrders.reduce((acc, wo) => {
            const hours = (new Date(wo.actual_completion_date!).getTime() - new Date(wo.date_assigned!).getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }, 0) / completedOrders.length
        : 0;

      // Get invoice total from invoices table
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('total_amount')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const totalInvoiceValue = invoiceData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      return {
        totalWorkOrders,
        monthOverMonth,
        avgCompletionTime,
        completionTimeTrend: 0, // TODO: Calculate trend
        firstTimeFixRate: 85, // Placeholder - calculate from reports
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
      // Work Order Trends - get daily counts by status
      const { data: workOrdersData } = await supabase
        .from('work_orders')
        .select('date_submitted, status')
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate)
        .order('date_submitted');

      // Trade Performance
      const { data: tradeData } = await supabase
        .from('work_orders')
        .select(`
          trade_id,
          status,
          actual_completion_date,
          date_assigned,
          trades!trade_id(name)
        `)
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate);

      // Organization Analysis
      const { data: orgData } = await supabase
        .from('work_orders')
        .select(`
          organization_id,
          status,
          actual_completion_date,
          date_assigned,
          organizations!organization_id(name)
        `)
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate);

      // Geographic Distribution
      const { data: geoData } = await supabase
        .from('work_orders')
        .select('state, city, actual_completion_date, date_assigned')
        .gte('date_submitted', startDate)
        .lte('date_submitted', endDate);

      // Transform work order trends data
      const trendsByDate: Record<string, { [status: string]: number }> = {};
      workOrdersData?.forEach(wo => {
        const date = format(new Date(wo.date_submitted), 'MMM dd');
        if (!trendsByDate[date]) {
          trendsByDate[date] = { received: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0 };
        }
        const status = wo.status === 'in_progress' ? 'inProgress' : wo.status;
        trendsByDate[date][status] = (trendsByDate[date][status] || 0) + 1;
      });

      const workOrderTrends = Object.entries(trendsByDate).map(([date, counts]) => ({
        date,
        received: counts.received || 0,
        assigned: counts.assigned || 0,
        inProgress: counts.inProgress || 0,
        completed: counts.completed || 0,
        cancelled: counts.cancelled || 0,
      }));

      // Transform trade performance data
      const tradeGroups: Record<string, { total: number; completed: number; totalTime: number; completedCount: number }> = {};
      tradeData?.forEach(wo => {
        const tradeName = wo.trades?.name || 'Unknown';
        if (!tradeGroups[tradeName]) {
          tradeGroups[tradeName] = { total: 0, completed: 0, totalTime: 0, completedCount: 0 };
        }
        tradeGroups[tradeName].total++;
        if (wo.status === 'completed') {
          tradeGroups[tradeName].completed++;
          if (wo.actual_completion_date && wo.date_assigned) {
            const hours = (new Date(wo.actual_completion_date).getTime() - new Date(wo.date_assigned).getTime()) / (1000 * 60 * 60);
            tradeGroups[tradeName].totalTime += hours;
            tradeGroups[tradeName].completedCount++;
          }
        }
      });

      const tradePerformance = Object.entries(tradeGroups).map(([tradeName, data]) => ({
        tradeName,
        avgCompletionHours: data.completedCount > 0 ? data.totalTime / data.completedCount : 0,
        totalOrders: data.total,
        completedOrders: data.completed,
      }));

      // Transform organization data
      const orgGroups: Record<string, { total: number; completed: number; totalTime: number; completedCount: number }> = {};
      orgData?.forEach(wo => {
        const orgName = wo.organizations?.name || 'Unknown';
        if (!orgGroups[orgName]) {
          orgGroups[orgName] = { total: 0, completed: 0, totalTime: 0, completedCount: 0 };
        }
        orgGroups[orgName].total++;
        if (wo.status === 'completed') {
          orgGroups[orgName].completed++;
          if (wo.actual_completion_date && wo.date_assigned) {
            const hours = (new Date(wo.actual_completion_date).getTime() - new Date(wo.date_assigned).getTime()) / (1000 * 60 * 60);
            orgGroups[orgName].totalTime += hours;
            orgGroups[orgName].completedCount++;
          }
        }
      });

      const organizationAnalysis = Object.entries(orgGroups).map(([organizationName, data]) => ({
        organizationName,
        totalOrders: data.total,
        completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        avgTurnaroundTime: data.completedCount > 0 ? data.totalTime / data.completedCount : 0,
      }));

      // Transform geographic data
      const geoGroups: Record<string, { count: number; totalTime: number; completedCount: number }> = {};
      geoData?.forEach(wo => {
        const key = `${wo.state}-${wo.city}`;
        if (!geoGroups[key]) {
          geoGroups[key] = { count: 0, totalTime: 0, completedCount: 0 };
        }
        geoGroups[key].count++;
        if (wo.actual_completion_date && wo.date_assigned) {
          const hours = (new Date(wo.actual_completion_date).getTime() - new Date(wo.date_assigned).getTime()) / (1000 * 60 * 60);
          geoGroups[key].totalTime += hours;
          geoGroups[key].completedCount++;
        }
      });

      const geographicDistribution = Object.entries(geoGroups).map(([key, data]) => {
        const [state, city] = key.split('-');
        return {
          state: state || '',
          city: city || '',
          workOrderCount: data.count,
          avgCompletionHours: data.completedCount > 0 ? data.totalTime / data.completedCount : 0,
        };
      });

      // Simplified subcontractor performance without materialized view
      const subcontractorPerformance: any[] = [];

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
      // Since we no longer have materialized views, just return true
      return true;
    },
    enabled: false, // Only run when manually triggered
  });
};
