import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Employee, EmployeesData } from '@/types/employee';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<EmployeesData> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'employee')
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
        company_name: profile.company_name, // Now directly from profiles table
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        user_type: 'employee' as const,
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
        .eq('user_type', 'employee')
        .single();

      if (error) {
        throw new Error(`Failed to fetch employee: ${error.message}`);
      }

      return profile;
    },
    enabled: !!employeeId,
  });
}