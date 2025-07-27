import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DataIntegrityIssue {
  type: 'orphaned_reports' | 'missing_reports' | 'missing_profiles' | 'orphaned_work_orders';
  label: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: any[];
}

export interface DataIntegrityResult {
  issues: DataIntegrityIssue[];
  totalIssues: number;
  healthScore: number;
}

export const useDataIntegrity = () => {
  const { data: result, isLoading, error, refetch } = useQuery({
    queryKey: ['data_integrity'],
    queryFn: async (): Promise<DataIntegrityResult> => {
      const issues: DataIntegrityIssue[] = [];

      try {
        // 1. Check for orphaned work order reports (reports without work orders)
        const { data: orphanedReports, error: orphanedError } = await supabase
          .from('work_order_reports')
          .select(`
            id,
            work_order_id,
            work_orders!left(id)
          `)
          .is('work_orders.id', null);

        if (orphanedError) throw orphanedError;

        const orphanedReportsCount = orphanedReports?.length || 0;
        if (orphanedReportsCount > 0) {
          issues.push({
            type: 'orphaned_reports',
            label: 'Orphaned Work Order Reports',
            count: orphanedReportsCount,
            severity: orphanedReportsCount > 10 ? 'critical' : orphanedReportsCount > 5 ? 'high' : 'medium',
            description: 'Work order reports that reference non-existent work orders',
            details: orphanedReports
          });
        }

        // 2. Check for completed work orders without reports
        const { data: workOrdersWithoutReports, error: missingReportsError } = await supabase
          .from('work_orders')
          .select(`
            id,
            status,
            work_order_reports!left (id)
          `)
          .eq('status', 'completed')
          .is('work_order_reports.id', null);

        if (missingReportsError) throw missingReportsError;

        const missingReportsCount = workOrdersWithoutReports?.length || 0;
        if (missingReportsCount > 0) {
          issues.push({
            type: 'missing_reports',
            label: 'Completed Work Orders Without Reports',
            count: missingReportsCount,
            severity: missingReportsCount > 20 ? 'high' : missingReportsCount > 10 ? 'medium' : 'low',
            description: 'Work orders marked as completed but missing completion reports',
            details: workOrdersWithoutReports
          });
        }

        // 3. Check for duplicate user profiles (simplified check)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email');

        if (profilesError) throw profilesError;

        // Check for duplicate user_ids
        const profileUserIds = profiles?.map(p => p.user_id) || [];
        const uniqueUserIds = new Set(profileUserIds);
        const duplicateProfilesCount = profileUserIds.length - uniqueUserIds.size;

        if (duplicateProfilesCount > 0) {
          issues.push({
            type: 'missing_profiles',
            label: 'Duplicate User Profiles',
            count: duplicateProfilesCount,
            severity: duplicateProfilesCount > 5 ? 'critical' : duplicateProfilesCount > 2 ? 'high' : 'medium',
            description: 'Multiple profile records found for the same user',
            details: profiles?.filter((p, i, arr) => arr.findIndex(x => x.user_id === p.user_id) !== i)
          });
        }

        // 4. Check for work orders without organizations
        const { data: orphanedWorkOrders, error: orphanedWOError } = await supabase
          .from('work_orders')
          .select(`
            id,
            organization_id,
            work_order_number,
            organizations!left(id)
          `)
          .is('organizations.id', null);

        if (orphanedWOError) throw orphanedWOError;

        const orphanedWorkOrdersCount = orphanedWorkOrders?.length || 0;
        if (orphanedWorkOrdersCount > 0) {
          issues.push({
            type: 'orphaned_work_orders',
            label: 'Work Orders Without Organizations',
            count: orphanedWorkOrdersCount,
            severity: orphanedWorkOrdersCount > 10 ? 'critical' : orphanedWorkOrdersCount > 5 ? 'high' : 'medium',
            description: 'Work orders that reference non-existent organizations',
            details: orphanedWorkOrders
          });
        }

      } catch (error) {
        console.error('Error running data integrity checks:', error);
        throw error;
      }

      const totalIssues = issues.reduce((sum, issue) => sum + issue.count, 0);
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const highIssues = issues.filter(i => i.severity === 'high').length;
      
      // Calculate health score (0-100)
      let healthScore = 100;
      if (criticalIssues > 0) healthScore -= criticalIssues * 25;
      if (highIssues > 0) healthScore -= highIssues * 15;
      if (issues.filter(i => i.severity === 'medium').length > 0) healthScore -= 10;
      if (issues.filter(i => i.severity === 'low').length > 0) healthScore -= 5;
      
      healthScore = Math.max(0, healthScore);

      return {
        issues,
        totalIssues,
        healthScore
      };
    },
    refetchInterval: 300000, // 5 minutes
  });

  return {
    result,
    isLoading,
    error,
    refetch
  };
};