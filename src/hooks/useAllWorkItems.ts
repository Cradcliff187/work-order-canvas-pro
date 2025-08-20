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
}

export function useAllWorkItems() {
  return useQuery({
    queryKey: ['all-work-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return [];
      }

      // Get current user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.log('Profile error or not found:', profileError);
        return [];
      }

      console.log('Current user profile ID:', profile.id);

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
            profiles!assigned_to(
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
            profiles!assigned_to(
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

      const workItems: WorkItem[] = [];

      // Process work orders
      workOrders?.forEach(wo => {
        // Find all assignments for this work order
        const assignments = wo.work_order_assignments || [];
        const myAssignment = assignments.find(a => a.assigned_to === profile.id);
        const isAssignedToMe = !!myAssignment;
        
        // Get name of first assignee (if not assigned to me)
        const otherAssignment = assignments.find(a => a.assigned_to !== profile.id);
        const assigneeName = !isAssignedToMe && otherAssignment?.profiles 
          ? `${otherAssignment.profiles.first_name} ${otherAssignment.profiles.last_name}`
          : undefined;

        // Determine if work order is completed
        const completedStatuses = ['work_completed', 'completed', 'cancelled', 'closed'];
        const isCompleted = completedStatuses.includes(wo.status);

        workItems.push({
          id: wo.id,
          type: 'work_order',
          number: wo.work_order_number,
          title: wo.title,
          assigneeName,
          isAssignedToMe,
          isCompleted
        });
      });

      // Process projects
      projects?.forEach(project => {
        // Find all assignments for this project
        const assignments = project.project_assignments || [];
        const myAssignment = assignments.find(a => a.assigned_to === profile.id);
        const isAssignedToMe = !!myAssignment;
        
        // Get name of first assignee (if not assigned to me)
        const otherAssignment = assignments.find(a => a.assigned_to !== profile.id);
        const assigneeName = !isAssignedToMe && otherAssignment?.profiles 
          ? `${otherAssignment.profiles.first_name} ${otherAssignment.profiles.last_name}`
          : undefined;

        // Projects with status 'completed' are considered completed
        const isCompleted = project.status === 'completed';

        workItems.push({
          id: project.id,
          type: 'project',
          number: project.project_number,
          title: project.name,
          assigneeName,
          isAssignedToMe,
          isCompleted
        });
      });

      console.log('Total work items processed:', workItems.length);
      console.log('My assignments:', workItems.filter(item => item.isAssignedToMe).length);
      console.log('Other work:', workItems.filter(item => !item.isAssignedToMe).length);

      return workItems;
    },
    enabled: !!supabase.auth.getUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}