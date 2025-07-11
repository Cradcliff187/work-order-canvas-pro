import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
  phone?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
  user_type: 'employee';
  is_employee: boolean;
}

export interface UpdateEmployeeRatesData {
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
}

export interface CreateEmployeeData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
  send_welcome_email?: boolean;
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_employee', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch employees: ${error.message}`);
      }

      const employees: Employee[] = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        is_active: profile.is_active,
        hourly_cost_rate: profile.hourly_cost_rate,
        hourly_billable_rate: profile.hourly_billable_rate,
        phone: profile.phone,
        company_name: profile.company_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        user_type: 'employee',
        is_employee: profile.is_employee,
      })) || [];

      return {
        employees,
        totalCount: employees.length,
        activeCount: employees.filter(emp => emp.is_active).length,
        inactiveCount: employees.filter(emp => !emp.is_active).length,
        averageCostRate: employees.filter(emp => emp.hourly_cost_rate).length > 0 
          ? employees.reduce((sum, emp) => sum + (emp.hourly_cost_rate || 0), 0) / employees.filter(emp => emp.hourly_cost_rate).length
          : 0,
        averageBillableRate: employees.filter(emp => emp.hourly_billable_rate).length > 0
          ? employees.reduce((sum, emp) => sum + (emp.hourly_billable_rate || 0), 0) / employees.filter(emp => emp.hourly_billable_rate).length
          : 0,
      };
    },
  });
}

export function useEmployee(employeeId: string) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .eq('is_employee', true)
        .single();

      if (error) {
        throw new Error(`Failed to fetch employee: ${error.message}`);
      }

      return profile;
    },
    enabled: !!employeeId,
  });
}

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
          company_name: employeeData.company_name,
          hourly_cost_rate: employeeData.hourly_cost_rate,
          hourly_billable_rate: employeeData.hourly_billable_rate,
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create employee: ${profileError.message}`);
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

// Utility function for formatting currency
export function formatCurrency(amount?: number): string {
  if (amount === null || amount === undefined) {
    return 'Not set';
  }
  return `$${amount.toFixed(2)}/hr`;
}