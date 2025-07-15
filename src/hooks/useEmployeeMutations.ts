import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UpdateEmployeeRatesData, CreateEmployeeData } from '@/types/employee';

export function useEmployeeMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateEmployeeRates = useMutation({
    mutationFn: async ({ employeeId, ratesData }: { employeeId: string; ratesData: UpdateEmployeeRatesData }) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          hourly_cost_rate: ratesData.hourly_cost_rate,
          hourly_billable_rate: ratesData.hourly_billable_rate,
        })
        .eq('id', employeeId)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update employee rates: ${error.message}`);
      }

      if (!profile) {
        throw new Error('Employee not found');
      }

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      toast({
        title: "Rates updated",
        description: "Employee billing rates have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating rates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const toggleEmployeeStatus = useMutation({
    mutationFn: async ({ employeeId, isActive }: { employeeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', employeeId)
        .eq('is_employee', true);

      if (error) {
        throw new Error(`Failed to update employee status: ${error.message}`);
      }

      return { employeeId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', data.employeeId] });
      toast({
        title: "Employee status updated",
        description: `Employee has been ${data.isActive ? 'activated' : 'deactivated'}.`,
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

  return {
    updateEmployeeRates,
    createEmployee,
    toggleEmployeeStatus,
  };
}