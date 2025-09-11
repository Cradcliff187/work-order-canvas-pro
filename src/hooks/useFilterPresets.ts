import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeManagementFilters } from './useTimeManagement';

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: TimeManagementFilters;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export function useFilterPresets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user's filter presets
  const { data: presets, isLoading } = useQuery({
    queryKey: ['filter-presets'],
    queryFn: async (): Promise<FilterPreset[]> => {
      const { data, error } = await supabase
        .from('filter_presets')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []).map(preset => ({
        ...preset,
        filters: preset.filters as unknown as TimeManagementFilters
      }));
    },
  });

  // Save filter preset
  const savePresetMutation = useMutation({
    mutationFn: async (preset: { name: string; description?: string; filters: TimeManagementFilters }) => {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('filter_presets')
        .insert({
          name: preset.name,
          description: preset.description,
          filters: JSON.parse(JSON.stringify(preset.filters)),
          user_id: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-presets'] });
      toast({
        title: 'Success',
        description: 'Filter preset saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save filter preset',
        variant: 'destructive',
      });
    },
  });

  // Update filter preset
  const updatePresetMutation = useMutation({
    mutationFn: async ({ id, ...preset }: { id: string; name: string; description?: string; filters: TimeManagementFilters }) => {
      const { data, error } = await supabase
        .from('filter_presets')
        .update({
          name: preset.name,
          description: preset.description,
          filters: JSON.parse(JSON.stringify(preset.filters)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-presets'] });
      toast({
        title: 'Success',
        description: 'Filter preset updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update filter preset',
        variant: 'destructive',
      });
    },
  });

  // Delete filter preset
  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('filter_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-presets'] });
      toast({
        title: 'Success',
        description: 'Filter preset deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete filter preset',
        variant: 'destructive',
      });
    },
  });

  // Get predefined common presets
  const getCommonPresets = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    return [
      {
        name: 'Pending This Week',
        description: 'All pending entries from this week',
        filters: {
          employeeIds: [],
          dateFrom: weekStart.toISOString().split('T')[0],
          dateTo: weekEnd.toISOString().split('T')[0],
          workOrderIds: [],
          projectIds: [],
          status: ['pending'],
          search: '',
          page: 1,
          limit: 50
        }
      },
      {
        name: 'Flagged Items',
        description: 'All flagged time entries',
        filters: {
          employeeIds: [],
          dateFrom: '',
          dateTo: '',
          workOrderIds: [],
          projectIds: [],
          status: ['flagged'],
          search: '',
          page: 1,
          limit: 50
        }
      },
      {
        name: 'Today\'s Entries',
        description: 'All entries submitted today',
        filters: {
          employeeIds: [],
          dateFrom: today,
          dateTo: today,
          workOrderIds: [],
          projectIds: [],
          status: [],
          search: '',
          page: 1,
          limit: 50
        }
      },
      {
        name: 'Overtime Hours',
        description: 'Entries with overtime hours',
        filters: {
          employeeIds: [],
          dateFrom: '',
          dateTo: '',
          workOrderIds: [],
          projectIds: [],
          status: [],
          search: 'overtime',
          page: 1,
          limit: 50
        }
      }
    ];
  };

  return {
    presets: presets || [],
    commonPresets: getCommonPresets(),
    isLoading,
    savePreset: savePresetMutation.mutate,
    updatePreset: updatePresetMutation.mutate,
    deletePreset: deletePresetMutation.mutate,
    isSaving: savePresetMutation.isPending,
    isUpdating: updatePresetMutation.isPending,
    isDeleting: deletePresetMutation.isPending,
  };
}