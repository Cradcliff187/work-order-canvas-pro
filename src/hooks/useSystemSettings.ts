
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSystemSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['system_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ category, key, value, description }: {
      category: string;
      key: string;
      value: any;
      description?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          category,
          setting_key: key,
          setting_value: value,
          description,
          updated_by_user_id: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_settings'] });
      toast({
        title: 'Success',
        description: 'Setting updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      });
    },
  });

  const getSetting = (key: string) => {
    return settings?.find(s => s.setting_key === key)?.setting_value;
  };

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    getSetting,
  };
};
