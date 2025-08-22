import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryPerformance } from '@/hooks/useQueryPerformance';

export interface WorkItem {
  id: string;
  type: 'work_order' | 'project';
  number: string;
  title: string;
  assigneeName?: string;
  isAssignedToMe: boolean;
  isCompleted: boolean;
  status: string;
}

export function useAllWorkItems() {
  const { profile } = useAuth();
  
  const queryKey = ['all-work-items', profile?.id];
  
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!profile?.id) {
        return [];
      }

      // Get user's organization memberships in parallel with work items
      const [orgMembershipsResult, workOrdersResult, projectsResult] = await Promise.all([
        supabase
          .from('organization_members')
          .select(`
            organization_id,
            role,
            organizations!inner(
              name,
              organization_type
            )
          `)
          .eq('user_id', profile.id),
        
        supabase
          .from('work_orders')
          .select(`
            id,
            work_order_number,
            title,
            status,
            work_order_assignments(
              assigned_to,
              profiles!work_order_assignments_assigned_to_fkey(
                first_name,
                last_name
              )
            )
          `),
          
        supabase
          .from('projects')
          .select(`
            id,
            project_number,
            name,
            status,
            project_assignments(
              assigned_to,
              profiles!project_assignments_assigned_to_fkey(
                first_name,
                last_name
              )
            )
          `)
      ]);

      if (orgMembershipsResult.error) throw orgMembershipsResult.error;
      if (workOrdersResult.error) throw workOrdersResult.error;
      if (projectsResult.error) throw projectsResult.error;

      const orgMemberships = orgMembershipsResult.data || [];
      const workOrders = workOrdersResult.data || [];
      const projects = projectsResult.data || [];

      const isInternalEmployee = orgMemberships.some(om => 
        om.organizations.organization_type === 'internal' && 
        ['admin', 'manager', 'employee'].includes(om.role)
      );

      const workItems: WorkItem[] = [];

      // Process work orders
      workOrders.forEach(wo => {
        // Skip completed work orders
        const completedStatuses = ['work_completed', 'completed', 'cancelled', 'closed'];
        const isCompleted = completedStatuses.includes(wo.status);
        if (isCompleted) return;

        const assignments = wo.work_order_assignments || [];
        const myAssignment = assignments.find(a => a.assigned_to === profile.id);
        const isAssignedToMe = !!myAssignment;
        
        // Show work order if:
        // 1. It's assigned to me, OR
        // 2. I'm internal employee and it's available
        const hasNoAssignments = assignments.length === 0;
        const shouldShow = isAssignedToMe || (isInternalEmployee && (hasNoAssignments || true));
        
        if (shouldShow) {
          // Get name of first assignee (if not assigned to me)
          const otherAssignment = assignments.find(a => a.assigned_to !== profile.id);
          const assigneeName = !isAssignedToMe && otherAssignment?.profiles 
            ? `${otherAssignment.profiles.first_name} ${otherAssignment.profiles.last_name}`
            : undefined;

          workItems.push({
            id: wo.id,
            type: 'work_order',
            number: wo.work_order_number,
            title: wo.title,
            assigneeName,
            isAssignedToMe,
            isCompleted,
            status: wo.status || 'unknown'
          });
        }
      });

      // Process projects  
      projects.forEach(project => {
        // Skip completed projects
        const isCompleted = project.status === 'completed';
        if (isCompleted) return;

        const assignments = project.project_assignments || [];
        const myAssignment = assignments.find(a => a.assigned_to === profile.id);
        const isAssignedToMe = !!myAssignment;
        
        // Show project if:
        // 1. It's assigned to me, OR
        // 2. I'm internal employee and it's available
        const hasNoAssignments = assignments.length === 0;
        const shouldShow = isAssignedToMe || (isInternalEmployee && (hasNoAssignments || true));
        
        if (shouldShow) {
          // Get name of first assignee (if not assigned to me)
          const otherAssignment = assignments.find(a => a.assigned_to !== profile.id);
          const assigneeName = !isAssignedToMe && otherAssignment?.profiles 
            ? `${otherAssignment.profiles.first_name} ${otherAssignment.profiles.last_name}`
            : undefined;

          workItems.push({
            id: project.id,
            type: 'project',
            number: project.project_number,
            title: project.name,
            assigneeName,
            isAssignedToMe,
            isCompleted,
            status: project.status || 'unknown'
          });
        }
      });

      return workItems;
    },
    enabled: !!profile?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes instead of 30 seconds
  });

  // Add performance tracking
  useQueryPerformance(
    queryKey,
    query.isLoading,
    query.error,
    query.data
  );

  return query;
}