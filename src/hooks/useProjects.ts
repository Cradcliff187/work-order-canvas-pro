import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

// Types from database
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export interface Project {
  id: string;
  name: string;
  project_number: string | null;
  description: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFilters {
  status?: string[];
  search?: string;
  organization_id?: string;
}

export function useProjects(
  pagination: { pageIndex: number; pageSize: number },
  sorting: { sortBy: Array<{ id: string; desc: boolean }> },
  filters: ProjectFilters
) {
  const { pageIndex, pageSize } = pagination;
  const { sortBy } = sorting;
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', pagination, sorting, filters, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user found');

      let query = supabase
        .from('projects')
        .select('*', { count: 'exact' });

      // Apply pagination
      query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.or(`name.ilike.${searchTerm},project_number.ilike.${searchTerm},location_address.ilike.${searchTerm}`);
      }
      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }

      // Apply sorting
      if (sortBy && sortBy.length > 0) {
        sortBy.forEach((sort) => {
          query = query.order(sort.id, { ascending: !sort.desc });
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      const pageCount = count ? Math.ceil(count / pageSize) : 0;

      return {
        data: data as Project[] || [],
        pageCount,
        totalCount: count || 0,
      };
    },
    enabled: !!user,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<ProjectInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: project, error } = await supabase
        .from('projects')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectUpdate }) => {
      const { data: project, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });
}