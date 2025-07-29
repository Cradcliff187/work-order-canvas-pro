import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { onOrganizationChange, syncUserMetadataToJWT } from '@/lib/auth/jwtSync';
import type { Database } from '@/integrations/supabase/types';

export type User = Database['public']['Tables']['profiles']['Row'] & {
  organization_members: Array<{
    organization_id: string;
    role: string;
    organization: {
      id: string;
      name: string;
      organization_type: 'partner' | 'subcontractor' | 'internal';
    };
  }>;
};

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          organization_members(
            organization_id,
            role,
            organization:organizations(
              id,
              name,
              organization_type
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as User[];
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          organization_members(
            organization_id,
            role,
            organization:organizations(
              id,
              name,
              organization_type
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as User;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      organization_id?: string;
    }) => {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
      });

      if (authError) throw authError;

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Link to organization if provided
      if (userData.organization_id) {
        const { error: orgError } = await supabase
          .from('organization_members')
          .insert({
            user_id: profileData.id,
            organization_id: userData.organization_id,
            role: 'member'
          });

        if (orgError) throw orgError;

        // Sync JWT metadata after organization assignment
        await onOrganizationChange(authData.user.id);
      }

      return profileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create user',
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<User> & { id: string }) => {
      // Update only the profile fields that exist in the database
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.first_name,
          last_name: updates.last_name,
          email: updates.email,
          phone: updates.phone,
          hourly_billable_rate: updates.hourly_billable_rate,
          hourly_cost_rate: updates.hourly_cost_rate,
          is_active: updates.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', result.id] });
      toast({
        title: 'Success',
        description: 'User updated successfully (profile and auth synchronized)',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user',
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete user',
      });
    },
  });
}

export function useBulkUpdateUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: { ids: string[]; data: Partial<User> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates.data)
        .in('id', updates.ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'Users updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update users',
      });
    },
  });
}

// New hook for updating user organizations with JWT sync
export function useUpdateUserOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, profileId, organizationId }: { 
      userId: string; 
      profileId: string;
      organizationId: string | null;
    }) => {
      // First, remove any existing organizations
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', profileId);

      if (deleteError) throw deleteError;

      // Then add the new organization if provided
      if (organizationId) {
        const { error: insertError } = await supabase
          .from('organization_members')
          .insert({
            user_id: profileId,
            organization_id: organizationId,
            role: 'member'
          });

        if (insertError) throw insertError;
      }

      // Sync JWT metadata after organization change
      await onOrganizationChange(userId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast({
        title: 'Success',
        description: 'User organization updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user organization',
      });
    },
  });
}

export function useUserMutations() {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const bulkUpdateUsers = useBulkUpdateUsers();
  const updateUserOrganization = useUpdateUserOrganization();

  return {
    createUser,
    updateUser,
    deleteUser,
    bulkUpdateUsers,
    updateUserOrganization,
  };
}