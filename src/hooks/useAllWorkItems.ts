import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkItem {
  id: string;
  type: 'work_order' | 'project';
  number: string;
  title: string;
  assigneeName?: string;
  isAssignedToMe: boolean;
}

export function useAllWorkItems() {
  return useQuery({
    queryKey: ['all-work-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get current user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      // Fetch work orders with assignments
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          title,
          work_order_assignments!work_order_id(
            assigned_to,
            profiles!assigned_to(
              first_name,
              last_name
            )
          )
        `);

      if (woError) throw woError;

      // Fetch projects with assignments
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select(`
          id,
          project_number,
          name,
          project_assignments!project_id(
            assigned_to,
            profiles!assigned_to(
              first_name,
              last_name
            )
          )
        `);

      if (projError) throw projError;

      const workItems: WorkItem[] = [];

      // Process work orders
      workOrders?.forEach(wo => {
        const assignment = wo.work_order_assignments?.[0];
        const isAssignedToMe = assignment?.assigned_to === profile.id;
        const assigneeName = assignment?.profiles 
          ? `${assignment.profiles.first_name} ${assignment.profiles.last_name}`
          : undefined;

        workItems.push({
          id: wo.id,
          type: 'work_order',
          number: wo.work_order_number,
          title: wo.title,
          assigneeName: isAssignedToMe ? undefined : assigneeName,
          isAssignedToMe
        });
      });

      // Process projects
      projects?.forEach(project => {
        const assignment = project.project_assignments?.[0];
        const isAssignedToMe = assignment?.assigned_to === profile.id;
        const assigneeName = assignment?.profiles 
          ? `${assignment.profiles.first_name} ${assignment.profiles.last_name}`
          : undefined;

        workItems.push({
          id: project.id,
          type: 'project',
          number: project.project_number,
          title: project.name,
          assigneeName: isAssignedToMe ? undefined : assigneeName,
          isAssignedToMe
        });
      });

      return workItems;
    },
    enabled: !!supabase.auth.getUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}