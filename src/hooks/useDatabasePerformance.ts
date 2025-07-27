import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TableCount {
  table_name: string;
  count: number;
}

interface GrowthMetric {
  table_name: string;
  total_count: number;
  recent_count: number;
  growth_rate: number;
  growth_color: 'green' | 'yellow' | 'red';
}

interface DatabasePerformanceData {
  tableCounts: TableCount[];
  growthMetrics: GrowthMetric[];
  largestTables: TableCount[];
  totalRecords: number;
}

const getGrowthColor = (growthRate: number): 'green' | 'yellow' | 'red' => {
  if (growthRate < 10) return 'green';
  if (growthRate < 30) return 'yellow';
  return 'red';
};

export const useDatabasePerformance = () => {
  return useQuery({
    queryKey: ['database-performance'],
    queryFn: async (): Promise<DatabasePerformanceData> => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoIso = sevenDaysAgo.toISOString();

      // Get table counts using individual queries
      const [profilesResult, workOrdersResult, orgsResult, reportsResult, assignmentsResult, invoicesResult] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_reports').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_assignments').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true })
      ]);

      const tableCounts: TableCount[] = [
        { table_name: 'profiles', count: profilesResult.count || 0 },
        { table_name: 'work_orders', count: workOrdersResult.count || 0 },
        { table_name: 'organizations', count: orgsResult.count || 0 },
        { table_name: 'work_order_reports', count: reportsResult.count || 0 },
        { table_name: 'work_order_assignments', count: assignmentsResult.count || 0 },
        { table_name: 'invoices', count: invoicesResult.count || 0 }
      ].sort((a, b) => b.count - a.count);

      // Get growth metrics
      const [recentProfiles, recentWorkOrders, recentOrgs, recentReports, recentAssignments, recentInvoices] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoIso),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).gte('date_submitted', sevenDaysAgoIso),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoIso),
        supabase.from('work_order_reports').select('*', { count: 'exact', head: true }).gte('submitted_at', sevenDaysAgoIso),
        supabase.from('work_order_assignments').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoIso),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoIso)
      ]);

      const growthMetrics: GrowthMetric[] = [
        {
          table_name: 'profiles',
          total_count: profilesResult.count || 0,
          recent_count: recentProfiles.count || 0,
          growth_rate: profilesResult.count ? ((recentProfiles.count || 0) / profilesResult.count) * 100 : 0,
          growth_color: 'green'
        },
        {
          table_name: 'work_orders',
          total_count: workOrdersResult.count || 0,
          recent_count: recentWorkOrders.count || 0,
          growth_rate: workOrdersResult.count ? ((recentWorkOrders.count || 0) / workOrdersResult.count) * 100 : 0,
          growth_color: 'green'
        },
        {
          table_name: 'organizations',
          total_count: orgsResult.count || 0,
          recent_count: recentOrgs.count || 0,
          growth_rate: orgsResult.count ? ((recentOrgs.count || 0) / orgsResult.count) * 100 : 0,
          growth_color: 'green'
        },
        {
          table_name: 'work_order_reports',
          total_count: reportsResult.count || 0,
          recent_count: recentReports.count || 0,
          growth_rate: reportsResult.count ? ((recentReports.count || 0) / reportsResult.count) * 100 : 0,
          growth_color: 'green'
        },
        {
          table_name: 'work_order_assignments',
          total_count: assignmentsResult.count || 0,
          recent_count: recentAssignments.count || 0,
          growth_rate: assignmentsResult.count ? ((recentAssignments.count || 0) / assignmentsResult.count) * 100 : 0,
          growth_color: 'green'
        },
        {
          table_name: 'invoices',
          total_count: invoicesResult.count || 0,
          recent_count: recentInvoices.count || 0,
          growth_rate: invoicesResult.count ? ((recentInvoices.count || 0) / invoicesResult.count) * 100 : 0,
          growth_color: 'green'
        }
      ].map(metric => ({
        ...metric,
        growth_color: getGrowthColor(metric.growth_rate)
      }));

      const totalRecords = tableCounts.reduce((sum, table) => sum + table.count, 0);

      return {
        tableCounts,
        growthMetrics,
        largestTables: tableCounts.slice(0, 5),
        totalRecords
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
};