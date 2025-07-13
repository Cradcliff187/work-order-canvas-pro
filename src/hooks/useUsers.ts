import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/pages/admin/AdminUsers';
import { useToast } from '@/hooks/use-toast';

// Generate a secure password for new users
function generateSecurePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  phone?: string;
  company_name?: string;
  organization_ids?: string[];
  send_welcome_email?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  user_type?: 'admin' | 'partner' | 'subcontractor' | 'employee';
  phone?: string;
  company_name?: string;
  is_active?: boolean;
  organization_ids?: string[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Get users with their organization relationships
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_organizations(
            organization:organizations(id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw new Error(`Failed to fetch users: ${profilesError.message}`);
      }

      // Transform the data to include organizations array
      const users: User[] = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        user_type: profile.user_type,
        is_active: profile.is_active,
        phone: profile.phone,
        company_name: profile.company_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        organizations: profile.user_organizations?.map((uo: any) => uo.organization) || [],
        last_sign_in_at: undefined, // We'll need to get this from auth.users if needed
      })) || [];

      return {
        users,
        totalCount: users.length,
      };
    },
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_organizations(
            organization:organizations(id, name)
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }

      return {
        ...profile,
        organizations: profile.user_organizations?.map((uo: any) => uo.organization) || [],
      };
    },
    enabled: !!userId,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createUser = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      // Generate a secure temporary password
      const temporaryPassword = generateSecurePassword();
      
      // Call the Edge Function to create the user
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          userData,
          temporaryPassword,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create user');
      }

      if (!data.success) {
        console.error('User creation failed:', data.error);
        throw new Error(data.error || 'Failed to create user');
      }

      return {
        profile: data.user,
        authUser: null, // Not needed from Edge Function
        temporaryPassword: data.credentials?.password || temporaryPassword,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User created",
        description: "The new user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: UpdateUserData }) => {
      // Update the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type,
          phone: userData.phone,
          company_name: userData.company_name,
          is_active: userData.is_active,
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to update user: ${profileError.message}`);
      }

      // Update organization relationships if provided
      if (userData.organization_ids) {
        // Delete existing relationships
        await supabase
          .from('user_organizations')
          .delete()
          .eq('user_id', userId);

        // Create new relationships
        if (userData.organization_ids.length > 0) {
          const orgRelationships = userData.organization_ids.map(orgId => ({
            user_id: userId,
            organization_id: orgId,
          }));

          const { error: orgError } = await supabase
            .from('user_organizations')
            .insert(orgRelationships);

          if (orgError) {
            throw new Error(`Failed to update organizations: ${orgError.message}`);
          }
        }
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete organization relationships first
      await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId);

      // Delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }

      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to update user status: ${error.message}`);
      }

      return { userId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data.userId] });
      toast({
        title: "User status updated",
        description: `User has been ${data.isActive ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateUsers = useMutation({
    mutationFn: async ({ userIds, updates }: { userIds: string[]; updates: Partial<UpdateUserData> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .in('id', userIds);

      if (error) {
        throw new Error(`Failed to bulk update users: ${error.message}`);
      }

      return { userIds, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Users updated",
        description: "Selected users have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating users",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    bulkUpdateUsers,
  };
}