import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectAssignment {
  id: string;
  name: string;
  project_number: string;
  location_address: string | null;
}

export function useProjectAssignments() {
  return useQuery({
    queryKey: ['project-assignments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          project_id,
          projects!project_id(
            id,
            name,
            project_number,
            location_address
          )
        `)
        .eq('assigned_to', user.id);

      if (error) throw error;

      return data?.map(assignment => ({
        id: assignment.projects.id,
        name: assignment.projects.name,
        project_number: assignment.projects.project_number,
        location_address: assignment.projects.location_address
      })) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}