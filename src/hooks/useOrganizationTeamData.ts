import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OrganizationMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  active_work_orders: number;
  completed_this_month: number;
  last_activity?: string;
}

interface OrganizationActivity {
  id: string;
  type: 'report_submitted' | 'work_started' | 'work_completed' | 'message_sent';
  work_order_number: string;
  work_order_title: string;
  user_name: string;
  user_avatar?: string;
  timestamp: string;
  organization_name: string;
}

export const useOrganizationTeamData = () => {
  const { userOrganizations } = useAuth();
  
  const userOrgIds = userOrganizations?.map(org => org.organization_id) || [];

  // Get organization members
  const organizationMembers = useQuery({
    queryKey: ['organization-members', userOrgIds],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (userOrgIds.length === 0) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles!inner(
            id,
            first_name,
            last_name,
            avatar_url,
            is_active
          )
        `)
        .in('organization_id', userOrgIds);

      if (error) throw error;

      // Get work order stats for each member
      const membersWithStats = await Promise.all(
        (data || []).map(async (member) => {
          const profileId = member.profiles.id;
          
          // Count active work orders assigned to this member's organizations
          const { count: activeCount } = await supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .in('assigned_organization_id', userOrgIds)
            .in('status', ['assigned', 'in_progress']);

          // Count completed work orders this month
          const firstOfMonth = new Date();
          firstOfMonth.setDate(1);
          firstOfMonth.setHours(0, 0, 0, 0);

          const { count: completedCount } = await supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .in('assigned_organization_id', userOrgIds)
            .eq('status', 'completed')
            .gte('date_completed', firstOfMonth.toISOString());

          return {
            id: profileId,
            first_name: member.profiles.first_name,
            last_name: member.profiles.last_name,
            avatar_url: member.profiles.avatar_url,
            is_active: member.profiles.is_active,
            active_work_orders: activeCount || 0,
            completed_this_month: completedCount || 0,
          };
        })
      );

      return membersWithStats;
    },
    enabled: userOrgIds.length > 0,
  });

  // Get recent organization activity
  const organizationActivity = useQuery({
    queryKey: ['organization-activity', userOrgIds],
    queryFn: async (): Promise<OrganizationActivity[]> => {
      if (userOrgIds.length === 0) return [];

      // Get recent work order reports from organization members
      const { data: recentReports, error } = await supabase
        .from('work_order_reports')
        .select(`
          id,
          submitted_at,
          work_orders!inner(
            work_order_number,
            title,
            assigned_organization_id,
            organizations!work_orders_organization_id_fkey(name)
          ),
          profiles!work_order_reports_subcontractor_user_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .in('work_orders.assigned_organization_id', userOrgIds)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const activities: OrganizationActivity[] = (recentReports || []).map(report => ({
        id: report.id,
        type: 'report_submitted' as const,
        work_order_number: report.work_orders.work_order_number,
        work_order_title: report.work_orders.title,
        user_name: `${report.profiles.first_name} ${report.profiles.last_name}`,
        user_avatar: report.profiles.avatar_url,
        timestamp: report.submitted_at,
        organization_name: report.work_orders.organizations?.name || 'Unknown Organization',
      }));

      return activities;
    },
    enabled: userOrgIds.length > 0,
  });

  return {
    organizationMembers: organizationMembers.data || [],
    organizationActivity: organizationActivity.data || [],
    isLoading: organizationMembers.isLoading || organizationActivity.isLoading,
    error: organizationMembers.error || organizationActivity.error,
  };
};