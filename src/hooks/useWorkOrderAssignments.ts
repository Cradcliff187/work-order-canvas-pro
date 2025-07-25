import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Assignment {
  id: string;
  work_order_id: string;
  assigned_to: string;
  assigned_organization_id: string | null;
  assignment_type: 'lead' | 'support' | 'assigned';
  assigned_at: string;
  assigned_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assignee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: Database['public']['Enums']['user_type'];
  };
  assigned_organization: {
    id: string;
    name: string;
    organization_type: Database['public']['Enums']['organization_type'];
  } | null;
  assigned_by_user: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateAssignmentData {
  work_order_id: string;
  assigned_to: string;
  assigned_organization_id?: string;
  assignment_type: 'lead' | 'support' | 'assigned';
  notes?: string;
}

export interface UpdateAssignmentData {
  assignment_type?: 'lead' | 'support' | 'assigned';
  notes?: string;
  assigned_organization_id?: string;
}

// Query Functions
/**
 * Fetches work order assignments with company-level access support
 * 
 * @param workOrderId - ID of work order to fetch assignments for
 * @returns Query result containing assignments with organization and user details
 * 
 * Company Access Features:
 * - Supports both individual and organization-level assignments
 * - Enables team-based work order collaboration
 * - Assignment types: 'lead' (primary responsibility) and 'support' (assistance)
 * - Organization assignments allow any team member to work on assigned orders
 * 
 * Assignment Models:
 * - Individual: Work order assigned to specific user (backward compatibility)
 * - Organization: Work order assigned to entire organization (company access)
 * - Mixed: Work order can have both individual and organization assignments
 */
export function useWorkOrderAssignments(workOrderId?: string) {
  return useQuery({
    queryKey: ['work-order-assignments', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [];
      
      const { data, error } = await supabase
        .from('work_order_assignments')
        .select(`
          *,
          assignee:profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name, email, user_type),
          assigned_organization:organizations!assigned_organization_id(id, name, organization_type),
          assigned_by_user:profiles!assigned_by(id, first_name, last_name)
        `)
        .eq('work_order_id', workOrderId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!workOrderId,
  });
}

export function useUserAssignments(userId?: string) {
  return useQuery({
    queryKey: ['user-assignments', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('work_order_assignments')
        .select(`
          *,
          work_order:work_orders!work_order_id(id, work_order_number, title, status),
          assigned_organization:organizations!assigned_organization_id(id, name, organization_type),
          assigned_by_user:profiles!assigned_by(id, first_name, last_name)
        `)
        .eq('assigned_to', userId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useOrganizationAssignments(organizationId?: string) {
  return useQuery({
    queryKey: ['organization-assignments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('work_order_assignments')
        .select(`
          *,
          assignee:profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name, email, user_type),
          work_order:work_orders!work_order_id(id, work_order_number, title, status),
          assigned_by_user:profiles!assigned_by(id, first_name, last_name)
        `)
        .eq('assigned_organization_id', organizationId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

// Mutation Hooks
export function useWorkOrderAssignmentMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addAssignment = useMutation({
    mutationFn: async (assignmentData: CreateAssignmentData) => {
      // Get the current user's profile ID instead of auth.uid()
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get profile ID from the authenticated user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const { data, error } = await supabase
        .from('work_order_assignments')
        .insert({
          ...assignmentData,
          assigned_by: profile.id,
        })
        .select(`
          *,
          assignee:profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name, email, user_type),
          assigned_organization:organizations!assigned_organization_id(id, name, organization_type),
          assigned_by_user:profiles!assigned_by(id, first_name, last_name)
        `)
        .single();

      if (error) throw error;
      return data as Assignment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast({
        title: 'Assignment created',
        description: `Successfully assigned to ${data.assignee.first_name} ${data.assignee.last_name}`,
      });
    },
    onError: (error: any) => {
      console.error('Assignment creation failed:', error);
      toast({
        title: 'Assignment failed',
        description: error.message || 'Failed to create assignment',
        variant: 'destructive',
      });
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async ({ workOrderId, userId }: { workOrderId: string; userId: string }) => {
      const { error } = await supabase
        .from('work_order_assignments')
        .delete()
        .eq('work_order_id', workOrderId)
        .eq('assigned_to', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast({
        title: 'Assignment removed',
        description: 'User has been unassigned from the work order',
      });
    },
    onError: (error: any) => {
      console.error('Assignment removal failed:', error);
      toast({
        title: 'Failed to remove assignment',
        description: error.message || 'Failed to remove assignment',
        variant: 'destructive',
      });
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ 
      workOrderId, 
      userId, 
      updates 
    }: { 
      workOrderId: string; 
      userId: string; 
      updates: UpdateAssignmentData 
    }) => {
      const { data, error } = await supabase
        .from('work_order_assignments')
        .update(updates)
        .eq('work_order_id', workOrderId)
        .eq('assigned_to', userId)
        .select(`
          *,
          assignee:profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name, email, user_type),
          assigned_organization:organizations!assigned_organization_id(id, name, organization_type),
          assigned_by_user:profiles!assigned_by(id, first_name, last_name)
        `)
        .single();

      if (error) throw error;
      return data as Assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      toast({
        title: 'Assignment updated',
        description: 'Assignment details have been updated',
      });
    },
    onError: (error: any) => {
      console.error('Assignment update failed:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });

  const bulkAddAssignments = useMutation({
    mutationFn: async (assignments: CreateAssignmentData[]) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get profile ID from the authenticated user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const assignmentsWithAssigner = assignments.map(assignment => ({
        ...assignment,
        assigned_by: profile.id,
      }));

      const { data, error } = await supabase
        .from('work_order_assignments')
        .insert(assignmentsWithAssigner)
        .select(`
          *,
          assignee:profiles!work_order_assignments_assigned_to_fkey(id, first_name, last_name, email, user_type),
          assigned_organization:organizations!assigned_organization_id(id, name, organization_type),
          assigned_by_user:profiles!assigned_by(id, first_name, last_name)
        `);

      if (error) throw error;
      return data as Assignment[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({
        title: 'Bulk assignment completed',
        description: `Successfully created ${data?.length} assignments`,
      });
    },
    onError: (error: any) => {
      console.error('Bulk assignment failed:', error);
      toast({
        title: 'Bulk assignment failed',
        description: error.message || 'Failed to create bulk assignments',
        variant: 'destructive',
      });
    },
  });

  const bulkRemoveAssignments = useMutation({
    mutationFn: async (workOrderIds: string[]) => {
      const { error } = await supabase
        .from('work_order_assignments')
        .delete()
        .in('work_order_id', workOrderIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['organization-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({
        title: 'Assignments removed',
        description: 'Successfully removed all assignments',
      });
    },
    onError: (error: any) => {
      console.error('Bulk assignment removal failed:', error);
      toast({
        title: 'Failed to remove assignments',
        description: error.message || 'Failed to remove assignments',
        variant: 'destructive',
      });
    },
  });

  return {
    addAssignment,
    removeAssignment,
    updateAssignment,
    bulkAddAssignments,
    bulkRemoveAssignments,
    isLoading: addAssignment.isPending || removeAssignment.isPending || updateAssignment.isPending || bulkAddAssignments.isPending || bulkRemoveAssignments.isPending,
  };
}

// Utility Functions
export function useValidateAssignment() {
  const validateAssignment = async (workOrderId: string, userId: string) => {
    // Check if assignment already exists
    const { data: existingAssignment, error: existingError } = await supabase
      .from('work_order_assignments')
      .select('id')
      .eq('work_order_id', workOrderId)
      .eq('assigned_to', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingAssignment) {
      throw new Error('User is already assigned to this work order');
    }

    // Check if user is active
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('is_active, user_type')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    if (!user.is_active) {
      throw new Error('Cannot assign inactive user');
    }

    // Check if work order exists and is assignable
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', workOrderId)
      .single();

    if (workOrderError) throw workOrderError;

    if (!['received', 'assigned', 'in_progress'].includes(workOrder.status)) {
      throw new Error('Work order is not in an assignable state');
    }

    return { isValid: true };
  };

  return { validateAssignment };
}