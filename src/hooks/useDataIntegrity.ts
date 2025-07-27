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
        console.log('Starting data integrity checks...');

        // 1. Check for orphaned work order reports (reports without work orders)
        const { data: allReports, error: reportsError } = await supabase
          .from('work_order_reports')
          .select('id, work_order_id');

        if (reportsError) throw reportsError;

        const { data: existingWorkOrders, error: workOrdersError } = await supabase
          .from('work_orders')
          .select('id');

        if (workOrdersError) throw workOrdersError;

        const existingWorkOrderIds = new Set(existingWorkOrders?.map(wo => wo.id) || []);
        const orphanedReports = allReports?.filter(report => !existingWorkOrderIds.has(report.work_order_id)) || [];
        
        console.log('Orphaned reports check:', { 
          totalReports: allReports?.length, 
          existingWorkOrders: existingWorkOrders?.length,
          orphanedCount: orphanedReports.length 
        });

        if (orphanedReports.length > 0) {
          issues.push({
            type: 'orphaned_reports',
            label: 'Orphaned Work Order Reports',
            count: orphanedReports.length,
            severity: orphanedReports.length > 10 ? 'critical' : orphanedReports.length > 5 ? 'high' : 'medium',
            description: 'Work order reports that reference non-existent work orders',
            details: orphanedReports
          });
        }

        // 2. Check for completed work orders without reports
        const { data: completedWorkOrders, error: completedError } = await supabase
          .from('work_orders')
          .select('id, work_order_number, status')
          .eq('status', 'completed');

        if (completedError) throw completedError;

        const { data: allWorkOrderReports, error: allReportsError } = await supabase
          .from('work_order_reports')
          .select('work_order_id');

        if (allReportsError) throw allReportsError;

        const workOrdersWithReports = new Set(allWorkOrderReports?.map(r => r.work_order_id) || []);
        const workOrdersWithoutReports = completedWorkOrders?.filter(wo => !workOrdersWithReports.has(wo.id)) || [];

        console.log('Missing reports check:', {
          completedWorkOrders: completedWorkOrders?.length,
          workOrdersWithReports: workOrdersWithReports.size,
          missingReports: workOrdersWithoutReports.length
        });

        if (workOrdersWithoutReports.length > 0) {
          issues.push({
            type: 'missing_reports',
            label: 'Completed Work Orders Without Reports',
            count: workOrdersWithoutReports.length,
            severity: workOrdersWithoutReports.length > 20 ? 'high' : workOrdersWithoutReports.length > 10 ? 'medium' : 'low',
            description: 'Work orders marked as completed but missing completion reports',
            details: workOrdersWithoutReports
          });
        }

        // 3. Check for duplicate user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, email');

        if (profilesError) throw profilesError;

        // Check for duplicate user_ids
        const profileUserIds = profiles?.map(p => p.user_id) || [];
        const uniqueUserIds = new Set(profileUserIds);
        const duplicateProfilesCount = profileUserIds.length - uniqueUserIds.size;

        console.log('Duplicate profiles check:', {
          totalProfiles: profiles?.length,
          uniqueUserIds: uniqueUserIds.size,
          duplicates: duplicateProfilesCount
        });

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
        const { data: allWorkOrdersWithOrgs, error: allWOError } = await supabase
          .from('work_orders')
          .select('id, work_order_number, organization_id');

        if (allWOError) throw allWOError;

        const { data: existingOrganizations, error: orgsError } = await supabase
          .from('organizations')
          .select('id');

        if (orgsError) throw orgsError;

        const existingOrgIds = new Set(existingOrganizations?.map(org => org.id) || []);
        const orphanedWorkOrders = allWorkOrdersWithOrgs?.filter(wo => !existingOrgIds.has(wo.organization_id)) || [];

        console.log('Orphaned work orders check:', {
          totalWorkOrders: allWorkOrdersWithOrgs?.length,
          existingOrgs: existingOrganizations?.length,
          orphanedWorkOrders: orphanedWorkOrders.length
        });

        if (orphanedWorkOrders.length > 0) {
          issues.push({
            type: 'orphaned_work_orders',
            label: 'Work Orders Without Organizations',
            count: orphanedWorkOrders.length,
            severity: orphanedWorkOrders.length > 10 ? 'critical' : orphanedWorkOrders.length > 5 ? 'high' : 'medium',
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

      console.log('Data Integrity Results:', {
        totalIssues,
        healthScore,
        issueCount: issues.length,
        issues: issues.map(i => ({ type: i.type, count: i.count, severity: i.severity }))
      });

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