import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['all-work-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 Auth User:', user?.id || 'NULL');
      
      if (!user) {
        console.log('❌ No authenticated user found');
        return [];
      }

      // Get current user's profile ID and organization memberships
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.log('❌ Profile error or not found:', profileError);
        return [];
      }

      console.log('✅ Current user profile:', {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email
      });

      // Critical debug - log raw assignment data
      console.log('🚨 ASSIGNMENT DEBUG', {
        authUserId: user.id,
        profileId: profile.id,
        profileEmail: profile.email,
        authUserIdType: typeof user.id,
        profileIdType: typeof profile.id
      });

      // Get user's organization memberships  
      const { data: orgMemberships, error: orgError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations!inner(
            name,
            organization_type
          )
        `)
        .eq('user_id', profile.id);

      if (orgError) {
        console.log('❌ Organization memberships error:', orgError);
      } else {
        console.log('🏢 User organizations:', orgMemberships?.map(om => ({
          org: om.organizations.name,
          type: om.organizations.organization_type,
          role: om.role
        })) || []);
      }

      const isInternalEmployee = orgMemberships?.some(om => 
        om.organizations.organization_type === 'internal' && 
        ['admin', 'manager', 'employee'].includes(om.role)
      ) || false;

      console.log('👤 Is Internal Employee:', isInternalEmployee);

      // Fetch ALL work orders with their assignments
      const { data: workOrders, error: woError } = await supabase
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
        `);

      if (woError) {
        console.log('Work orders error:', woError);
        throw woError;
      }

      // Fetch ALL projects with their assignments  
      const { data: projects, error: projError } = await supabase
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
        `);

      if (projError) {
        console.log('Projects error:', projError);
        throw projError;
      }

      console.log('Fetched work orders:', workOrders?.length || 0);
      console.log('Fetched projects:', projects?.length || 0);

      console.log('🔍 Debug: Current profile.id for comparison:', profile.id);

      const workItems: WorkItem[] = [];

      // Process work orders
      workOrders?.forEach(wo => {
        // Skip completed work orders for clock selector
        const completedStatuses = ['work_completed', 'completed', 'cancelled', 'closed'];
        const isCompleted = completedStatuses.includes(wo.status);
        if (isCompleted) return;

        // Find all assignments for this work order
        const assignments = wo.work_order_assignments || [];
        
        // Raw assignment debug logging
        console.log(`🔍 WO ${wo.work_order_number} RAW:`, {
          assignments: wo.work_order_assignments,
          profileIdType: typeof profile.id,
          assignmentIdTypes: wo.work_order_assignments?.map(a => ({
            assigned_to: a.assigned_to,
            type: typeof a.assigned_to
          }))
        });
        
        // Enhanced debug logging for assignment matching
        console.log(`🔍 Work Order ${wo.work_order_number} assignments:`, assignments.map(a => ({
          assigned_to: a.assigned_to,
          profile_data: a.profiles,
          matches_current_user: a.assigned_to === profile.id
        })));
        
        const myAssignment = assignments.find(a => a.assigned_to === profile.id);
        const isAssignedToMe = !!myAssignment;
        
        console.log(`📋 WO ${wo.work_order_number}: isAssignedToMe=${isAssignedToMe}, myAssignment:`, myAssignment);
        
        // Show work order if:
        // 1. It's assigned to me, OR
        // 2. I'm internal employee and (no assignments exist OR it's available)
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
      projects?.forEach(project => {
        // Skip completed projects for clock selector
        const isCompleted = project.status === 'completed';
        if (isCompleted) return;

        // Find all assignments for this project
        const assignments = project.project_assignments || [];
        
        // Raw assignment debug logging
        console.log(`🔍 Project ${project.project_number} RAW:`, {
          assignments: project.project_assignments,
          profileIdType: typeof profile.id,
          assignmentIdTypes: project.project_assignments?.map(a => ({
            assigned_to: a.assigned_to,
            type: typeof a.assigned_to
          }))
        });
        
        // Enhanced debug logging for assignment matching
        console.log(`🔍 Project ${project.project_number} assignments:`, assignments.map(a => ({
          assigned_to: a.assigned_to,
          profile_data: a.profiles,
          matches_current_user: a.assigned_to === profile.id
        })));
        
        const myAssignment = assignments.find(a => a.assigned_to === profile.id);
        const isAssignedToMe = !!myAssignment;
        
        console.log(`📋 Project ${project.project_number}: isAssignedToMe=${isAssignedToMe}, myAssignment:`, myAssignment);
        
        // Show project if:
        // 1. It's assigned to me, OR
        // 2. I'm internal employee and (no assignments exist OR it's available)
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

      console.log('📊 Work Items Summary:');
      console.log('  • Total work items processed:', workItems.length);
      console.log('  • My assignments:', workItems.filter(item => item.isAssignedToMe).length);
      console.log('  • Available work:', workItems.filter(item => !item.isAssignedToMe).length);
      console.log('  • Projects in results:', workItems.filter(item => item.type === 'project').length);
      console.log('  • Work orders in results:', workItems.filter(item => item.type === 'work_order').length);
      
      // Log specific work items for debugging
      console.log('🔍 Work Items Detail:', workItems.map(item => ({
        type: item.type,
        number: item.number,
        title: item.title,
        isAssignedToMe: item.isAssignedToMe,
        assigneeName: item.assigneeName
      })));

      return workItems;
    },
    enabled: !!supabase.auth.getUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}