import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/pages/admin/AdminUsers';
import { useToast } from '@/hooks/use-toast';
import { 
  validateUserOrganizationType, 
  getUserExpectedOrganizationType
} from '@/lib/utils/organizationValidation';
import { filterOrganizationsByUserType } from '@/lib/utils/userOrgMapping';
import { useOrganizations } from '@/hooks/useOrganizations';

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
  organization_id?: string; // Reference to organization instead of company_name
  organization_ids?: string[];
  
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  user_type?: 'admin' | 'partner' | 'subcontractor' | 'employee';
  phone?: string;
  organization_id?: string; // Reference to organization instead of company_name
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

      // Transform the data to include organizations array and get company name from organization
      const users: User[] = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        user_type: profile.user_type,
        is_active: profile.is_active,
        phone: profile.phone,
        company_name: profile.user_organizations?.[0]?.organization?.name || null, // From organization relationship
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
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_organizations!inner(
            organization_id,
            organization:organizations(*)
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createUser = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      // Client-side validation for organization types
      if (userData.organization_ids && userData.organization_ids.length > 0) {
        // Get organizations to validate
        const { data: organizations, error } = await supabase
          .from('organizations')
          .select('*')
          .in('id', userData.organization_ids);

        if (error) {
          throw new Error(`Failed to fetch organizations for validation: ${error.message}`);
        }

        // Validate each organization type matches user type
        const validationErrors = [];
        for (const org of organizations || []) {
          if (!validateUserOrganizationType(userData.user_type, org.organization_type)) {
            validationErrors.push(`User type '${userData.user_type}' cannot belong to organization type '${org.organization_type}' (${org.name})`);
          }
        }

        if (validationErrors.length > 0) {
          throw new Error(`Organization validation failed: ${validationErrors.join(', ')}`);
        }
      }

      // Generate a secure temporary password
      const temporaryPassword = generateSecurePassword();
      
      // Helper function to check if error is related to Edge Function configuration
      const isConfigurationError = (error: any): boolean => {
        const message = error?.message?.toLowerCase() || '';
        const status = error?.status || '';
        return message.includes('not found') || 
               message.includes('function not found') ||
               status === 404 ||
               status === '404';
      };

      // Helper function to check if error is a network error
      const isNetworkError = (error: any): boolean => {
        const message = error?.message?.toLowerCase() || '';
        return message.includes('network') ||
               message.includes('fetch') ||
               message.includes('connection') ||
               message.includes('timeout');
      };

      // Retry wrapper for network errors
      const invokeWithRetry = async (retries = 3): Promise<any> => {
        try {
          const { data, error } = await supabase.functions.invoke('create-admin-user', {
            body: {
              userData,
              send_welcome_email: true,
            }
          });

          if (error) {
            // Log full error details for debugging
            console.error('Edge function error details:', {
              error,
              message: error.message,
              status: error.status,
              userData: userData.email,
              timestamp: new Date().toISOString()
            });

            // Check for configuration errors
            if (isConfigurationError(error)) {
              throw new Error('User creation service not configured. Contact admin.');
            }

            // Retry network errors
            if (isNetworkError(error) && retries > 0) {
              console.warn(`Network error detected, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retries) * 1000));
              return invokeWithRetry(retries - 1);
            }

            throw new Error(error.message || 'Failed to create user');
          }

          return { data, error };
        } catch (err: any) {
          // Log full error details for debugging
          console.error('Edge function invocation error:', {
            error: err,
            message: err.message,
            stack: err.stack,
            userData: userData.email,
            timestamp: new Date().toISOString()
          });

          // Check for configuration errors
          if (isConfigurationError(err)) {
            throw new Error('User creation service not configured. Contact admin.');
          }

          // Retry network errors
          if (isNetworkError(err) && retries > 0) {
            console.warn(`Network error detected, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retries) * 1000));
            return invokeWithRetry(retries - 1);
          }

          throw err;
        }
      };

      // Call the Edge Function with retry logic
      const { data } = await invokeWithRetry();

      if (!data.success) {
        console.error('User creation failed:', data.error);
        throw new Error(data.error || 'Failed to create user');
      }

      return {
        profile: data.user,
        authUser: null, // Not needed from Edge Function
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User created",
        description: "The new user has been created successfully and will receive both welcome and confirmation emails.",
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
      // First, remove user from organizations
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId);

      if (userOrgError) {
        throw new Error(`Failed to remove user from organizations: ${userOrgError.message}`);
      }

      // Then delete the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Failed to delete user profile: ${profileError.message}`);
      }

      return userId;
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
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

/**
 * Hook to get auto-assignment preview for a user type
 */
export function useAutoAssignmentPreview(userType: 'admin' | 'partner' | 'subcontractor' | 'employee' | undefined) {
  const { data: organizationsData } = useOrganizations();
  
  return useQuery({
    queryKey: ['auto-assignment-preview', userType],
    queryFn: async () => {
      if (!userType || userType === 'admin') {
        return { 
          willAutoAssign: false,
          organization: null,
          availableOrganizations: []
        };
      }

      const organizations = organizationsData?.organizations || [];
      const filteredOrganizations = filterOrganizationsByUserType(organizations, userType);
      
      return {
        willAutoAssign: filteredOrganizations.length > 0,
        organization: filteredOrganizations[0] || null,
        availableOrganizations: filteredOrganizations
      };
    },
    enabled: !!userType && !!organizationsData,
  });
}
