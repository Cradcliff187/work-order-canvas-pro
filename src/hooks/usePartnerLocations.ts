import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type PartnerLocation = Tables<'partner_locations'>;
type PartnerLocationInsert = TablesInsert<'partner_locations'>;
type PartnerLocationUpdate = TablesUpdate<'partner_locations'>;

export const usePartnerLocations = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['partner-locations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile found');

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id)
        .single();

      if (!userOrg) throw new Error('No organization found for user');

      const { data, error } = await supabase
        .from('partner_locations')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('location_number');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });
};

export const usePartnerLocationMutations = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const createLocation = useMutation({
    mutationFn: async (location: Omit<PartnerLocationInsert, 'organization_id' | 'created_at' | 'updated_at' | 'id'>) => {
      if (!profile?.id) throw new Error('No user profile found');

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id)
        .single();

      if (!userOrg) throw new Error('No organization found for user');

      const { data, error } = await supabase
        .from('partner_locations')
        .insert({
          ...location,
          organization_id: userOrg.organization_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
      toast({
        title: 'Success',
        description: 'Location created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PartnerLocationUpdate }) => {
      const { data, error } = await supabase
        .from('partner_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partner_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createLocation,
    updateLocation,
    deleteLocation,
  };
};