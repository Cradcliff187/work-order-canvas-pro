import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { onOrganizationChange } from '@/lib/auth/jwtSync';
import { UpdateEmployeeRatesData } from '@/types/employee';

export function useEmployeeMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  interface UpdateEmployeeData {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    hourly_cost_rate?: number;
    hourly_billable_rate?: number;
    organization_id?: string;
  }

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateEmployeeData) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee updated",
        description: "The employee has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  interface CreateEmployeeData {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    hourly_cost_rate?: number;
    hourly_billable_rate?: number;
    organization_id?: string;
  }

  const createEmployee = useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      // Generate a UUID for the user_id (normally this would come from auth.users)
      const tempUserId = crypto.randomUUID();

      // Create the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: tempUserId,
          email: employeeData.email,
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          user_type: 'employee',
          is_employee: true,
          phone: employeeData.phone,
          hourly_cost_rate: employeeData.hourly_cost_rate,
          hourly_billable_rate: employeeData.hourly_billable_rate,
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create employee: ${profileError.message}`);
      }

      // Create organization relationship if organization_id provided
      if (employeeData.organization_id) {
        const { error: orgError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: profile.id,
            organization_id: employeeData.organization_id,
          });

        if (orgError) {
          // Clean up profile if organization relationship fails
          await supabase.from('profiles').delete().eq('id', profile.id);
          throw new Error(`Failed to assign organization: ${orgError.message}`);
        }

        // Sync JWT metadata after organization assignment
        await onOrganizationChange(tempUserId);
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee created",
        description: "The new employee has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee deleted",
        description: "The employee has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEmployeeRates = useMutation({
    mutationFn: async ({ employeeId, ...rates }: { employeeId: string } & UpdateEmployeeRatesData) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(rates)
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee rates updated",
        description: "The employee rates have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating employee rates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleEmployeeStatus = useMutation({
    mutationFn: async ({ employeeId, isActive }: { employeeId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee status updated",
        description: "The employee status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating employee status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEmployeeOrganization = useMutation({
    mutationFn: async ({ employeeId, userId, organizationId }: { 
      employeeId: string; 
      userId: string;
      organizationId: string | null;
    }) => {
      // First, remove any existing organizations
      const { error: deleteError } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', employeeId);

      if (deleteError) throw deleteError;

      // Then add the new organization if provided
      if (organizationId) {
        const { error: insertError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: employeeId,
            organization_id: organizationId,
          });

        if (insertError) throw insertError;
      }

      // Sync JWT metadata after organization change
      await onOrganizationChange(userId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({
        title: "Organization updated",
        description: "Employee organization has been updated successfully.",
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

  return {
    updateEmployee,
    updateEmployeeRates,
    toggleEmployeeStatus,
    createEmployee,
    deleteEmployee,
    updateEmployeeOrganization,
  };
}