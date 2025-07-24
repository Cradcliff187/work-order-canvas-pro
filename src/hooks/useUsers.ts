import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { onOrganizationChange, syncUserMetadataToJWT } from '@/lib/auth/jwtSync';
import type { Database } from '@/integrations/supabase/types';

export type User = Database['public']['Tables']['profiles']['Row'] & {
  user_organizations: Array<{
    organization_id: string;
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
          user_organizations(
            organization_id,
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
          user_organizations(
            organization_id,
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
      user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
      organization_id?: string;
    }) => {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type,
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
          user_type: userData.user_type,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Link to organization if provided
      if (userData.organization_id) {
        const { error: orgError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: profileData.id,
            organization_id: userData.organization_id,
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
      // Use the new database function that updates both profiles and auth.users atomically
      const { data, error } = await supabase.rpc('update_user_profile_and_auth', {
        p_profile_id: id,
        p_first_name: updates.first_name || '',
        p_last_name: updates.last_name || '',
        p_email: updates.email || '',
        p_user_type: updates.user_type || 'subcontractor',
        p_phone: updates.phone || null,
        p_company_name: updates.company_name || null,
        p_hourly_billable_rate: updates.hourly_billable_rate || null,
        p_hourly_cost_rate: updates.hourly_cost_rate || null,
        p_is_active: updates.is_active ?? true,
      });

      if (error) throw error;
      
      // Type the response properly
      const result = data as any;
      
      // Check if the function returned success
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to update user profile and auth metadata');
      }
      
      return result.profile;
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
        .from('user_organizations')
        .delete()
        .eq('user_id', profileId);

      if (deleteError) throw deleteError;

      // Then add the new organization if provided
      if (organizationId) {
        const { error: insertError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: profileId,
            organization_id: organizationId,
          });

        if (insertError) throw insertError;
      }

      // Sync JWT metadata after organization change
      await onOrganizationChange(userId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
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