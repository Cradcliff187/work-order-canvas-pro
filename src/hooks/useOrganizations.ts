import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Organization } from '@/pages/admin/AdminOrganizations';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface CreateOrganizationData {
  name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  organization_type: 'partner' | 'subcontractor' | 'internal';
  initials?: string;
  uses_partner_location_numbers?: boolean;
}

export interface UpdateOrganizationData {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  organization_type?: 'partner' | 'subcontractor' | 'internal';
  initials?: string;
  is_active?: boolean;
  uses_partner_location_numbers?: boolean;
}

/**
 * Fetches organizations with user-type aware access control
 * 
 * @returns Query result containing organizations with user counts and work order metrics
 * 
 * User Type Behavior:
 * - admin: Returns all organizations (full access)
 * - partner/subcontractor/employee: Returns only their assigned organization(s)
 * 
 * Organization Types:
 * - partner: Property management companies that submit work orders
 * - subcontractor: Trade companies that perform work (plumbing, HVAC, electrical)
 * - internal: General contractor company managing workflows
 */
export function useOrganizations() {
  const { session, user, profile, userOrganization } = useAuth();
  
  return useQuery({
    queryKey: ['organizations', user?.id, profile?.user_type],
    queryFn: async () => {
      console.log('🔍 useOrganizations: Starting query...');
      console.log('🔐 useOrganizations: Auth state:', {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        userType: profile?.user_type,
        hasUserOrganization: !!userOrganization
      });
      
      // For admins, return all organizations
      if (profile?.user_type === 'admin') {
        const { data: organizations, error } = await supabase
          .from('organizations')
          .select(`
            *,
            user_organizations(count),
            work_orders!work_orders_organization_id_fkey(
              id,
              status
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ useOrganizations: Query failed:', error);
          throw new Error(`Failed to fetch organizations: ${error.message}`);
        }

        const transformedOrgs: Organization[] = organizations?.map(org => ({
          id: org.id,
          name: org.name,
          contact_email: org.contact_email,
          contact_phone: org.contact_phone,
          address: org.address,
          organization_type: org.organization_type,
          initials: org.initials,
          is_active: org.is_active,
          created_at: org.created_at,
          updated_at: org.updated_at,
          users_count: org.user_organizations?.length || 0,
          work_orders_count: org.work_orders?.length || 0,
          active_work_orders_count: org.work_orders?.filter((wo: any) => 
            wo.status === 'received' || wo.status === 'assigned' || wo.status === 'in_progress'
          ).length || 0,
        })) || [];

        return {
          organizations: transformedOrgs,
          totalCount: transformedOrgs.length,
        };
      }

      // For non-admin users, return only their organization
      if (!userOrganization) {
        console.log('🔍 useOrganizations: No user organization found for non-admin user');
        return {
          organizations: [],
          totalCount: 0,
        };
      }

      // Query the user's organization with full details
      const { data: organization, error } = await supabase
        .from('organizations')
        .select(`
          *,
          user_organizations(count),
          work_orders!work_orders_organization_id_fkey(
            id,
            status
          )
        `)
        .eq('id', userOrganization.id)
        .single();

      if (error) {
        console.error('❌ useOrganizations: Query failed:', error);
        throw new Error(`Failed to fetch user organization: ${error.message}`);
      }

      const transformedOrg: Organization = {
        id: organization.id,
        name: organization.name,
        contact_email: organization.contact_email,
        contact_phone: organization.contact_phone,
        address: organization.address,
        organization_type: organization.organization_type,
        initials: organization.initials,
        is_active: organization.is_active,
        created_at: organization.created_at,
        updated_at: organization.updated_at,
        users_count: organization.user_organizations?.length || 0,
        work_orders_count: organization.work_orders?.length || 0,
        active_work_orders_count: organization.work_orders?.filter((wo: any) => 
          wo.status === 'received' || wo.status === 'assigned' || wo.status === 'in_progress'
        ).length || 0,
      };

      console.log('✅ useOrganizations: User organization result:', transformedOrg);
      return {
        organizations: [transformedOrg], // Single organization in array format
        totalCount: 1,
      };
    },
    enabled: !!session && !!user && !!profile, // Only run query when user is authenticated
  });
}

export function useOrganization(organizationId: string) {
  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const { data: organization, error } = await supabase
        .from('organizations')
        .select(`
          *,
          user_organizations(
            user:profiles(id, first_name, last_name, email, user_type, is_active)
          ),
          work_orders(
            id,
            work_order_number,
            title,
            status,
            created_at,
            date_submitted
          )
        `)
        .eq('id', organizationId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      return {
        ...organization,
        users: organization.user_organizations?.map((uo: any) => uo.user) || [],
        work_orders: organization.work_orders || [],
      };
    },
    enabled: !!organizationId,
  });
}

export function useOrganizationMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createOrganization = useMutation({
    mutationFn: async (orgData: CreateOrganizationData) => {
      const { data: organization, error } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name,
          contact_email: orgData.contact_email,
          contact_phone: orgData.contact_phone,
          address: orgData.address,
          organization_type: orgData.organization_type,
          initials: orgData.initials,
          uses_partner_location_numbers: orgData.uses_partner_location_numbers || false,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create organization: ${error.message}`);
      }

      return organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Organization created",
        description: "The new organization has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async ({ organizationId, orgData }: { organizationId: string; orgData: UpdateOrganizationData }) => {
      const { data: organization, error } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          contact_email: orgData.contact_email,
          contact_phone: orgData.contact_phone,
          address: orgData.address,
          organization_type: orgData.organization_type,
          initials: orgData.initials,
          is_active: orgData.is_active,
          uses_partner_location_numbers: orgData.uses_partner_location_numbers,
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update organization: ${error.message}`);
      }

      return organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({
        title: "Organization updated",
        description: "The organization has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      // Check if organization has active work orders
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('id')
        .eq('organization_id', organizationId)
        .in('status', ['received', 'assigned', 'in_progress']);

      if (woError) {
        throw new Error(`Failed to check work orders: ${woError.message}`);
      }

      if (workOrders && workOrders.length > 0) {
        throw new Error('Cannot delete organization with active work orders');
      }

      // Delete user relationships first
      await supabase
        .from('user_organizations')
        .delete()
        .eq('organization_id', organizationId);

      // Delete the organization
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (error) {
        throw new Error(`Failed to delete organization: ${error.message}`);
      }

      return organizationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Organization deleted",
        description: "The organization has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleOrganizationStatus = useMutation({
    mutationFn: async ({ organizationId, isActive }: { organizationId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: isActive })
        .eq('id', organizationId);

      if (error) {
        throw new Error(`Failed to update organization status: ${error.message}`);
      }

      return { organizationId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.organizationId] });
      toast({
        title: "Organization status updated",
        description: `Organization has been ${data.isActive ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating organization status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addUserToOrganization = useMutation({
    mutationFn: async ({ organizationId, userId }: { organizationId: string; userId: string }) => {
      const { error } = await supabase
        .from('user_organizations')
        .insert({
          organization_id: organizationId,
          user_id: userId,
        });

      if (error) {
        throw new Error(`Failed to add user to organization: ${error.message}`);
      }

      return { organizationId, userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User added to organization",
        description: "The user has been added to the organization successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding user to organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeUserFromOrganization = useMutation({
    mutationFn: async ({ organizationId, userId }: { organizationId: string; userId: string }) => {
      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove user from organization: ${error.message}`);
      }

      return { organizationId, userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User removed from organization",
        description: "The user has been removed from the organization successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing user from organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteOrganizations = useMutation({
    mutationFn: async (organizationIds: string[]) => {
      // Check for active work orders across all organizations
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('id, organization_id')
        .in('organization_id', organizationIds)
        .in('status', ['received', 'assigned', 'in_progress']);

      if (woError) {
        throw new Error(`Failed to check work orders: ${woError.message}`);
      }

      if (workOrders && workOrders.length > 0) {
        throw new Error(`Cannot delete organizations with active work orders (${workOrders.length} active work orders found)`);
      }

      // Delete user relationships first
      await supabase
        .from('user_organizations')
        .delete()
        .in('organization_id', organizationIds);

      // Delete the organizations
      const { error } = await supabase
        .from('organizations')
        .delete()
        .in('id', organizationIds);

      if (error) {
        throw new Error(`Failed to delete organizations: ${error.message}`);
      }

      return organizationIds;
    },
    onSuccess: (deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Organizations deleted",
        description: `Successfully deleted ${deletedIds.length} organization(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting organizations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkToggleOrganizationStatus = useMutation({
    mutationFn: async ({ organizationIds, isActive }: { organizationIds: string[]; isActive: boolean }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: isActive })
        .in('id', organizationIds);

      if (error) {
        throw new Error(`Failed to update organization status: ${error.message}`);
      }

      return { organizationIds, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: "Organization status updated",
        description: `Successfully ${data.isActive ? 'activated' : 'deactivated'} ${data.organizationIds.length} organization(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating organization status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createOrganization,
    updateOrganization,
    deleteOrganization,
    toggleOrganizationStatus,
    addUserToOrganization,
    removeUserFromOrganization,
    bulkDeleteOrganizations,
    bulkToggleOrganizationStatus,
  };
}

// Export the work orders organizations query
export { useOrganizationsForWorkOrders } from '@/hooks/useWorkOrders';