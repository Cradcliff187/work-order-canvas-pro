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
      console.log('🔐 useProjectAssignments - Auth User:', user?.id || 'NULL');
      
      if (!user) {
        console.log('❌ No authenticated user in useProjectAssignments');
        return [];
      }

      // Get current user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.log('❌ Profile error in useProjectAssignments:', profileError);
        return [];
      }

      console.log('✅ Profile ID for project assignments:', profile.id);

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
        .eq('assigned_to', profile.id);

      console.log('📊 Project assignments query result:', { data, error });

      if (error) {
        console.log('❌ Project assignments error:', error);
        throw error;
      }

      const assignments = data?.map(assignment => ({
        id: assignment.projects.id,
        name: assignment.projects.name,
        project_number: assignment.projects.project_number,
        location_address: assignment.projects.location_address
      })) || [];

      console.log('🏗️ Processed project assignments:', assignments);
      
      return assignments;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}