import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssigneeData {
  id: string;
  first_name: string;
  last_name: string;
  type: 'employee' | 'subcontractor';
  organization: string;
  organization_id?: string;
  workload: number;
  is_active: boolean;
  
  email: string;
}

export function useEmployeesForAssignment() {
  return useQuery({
    queryKey: ['employees-for-assignment'],
    queryFn: async (): Promise<AssigneeData[]> => {
      // Get active employees
      const { data: employees, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'employee')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      // Get workload for employees
      const { data: workOrders, error: workOrderError } = await supabase
        .from('work_orders')
        .select('assigned_to')
        .in('status', ['assigned', 'in_progress'])
        .not('assigned_to', 'is', null);

      if (workOrderError) throw workOrderError;

      // Calculate workload
      const workloadMap = workOrders.reduce((acc, wo) => {
        if (wo.assigned_to) {
          acc[wo.assigned_to] = (acc[wo.assigned_to] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return employees.map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        type: 'employee' as const,
        organization: 'Internal',
        organization_id: undefined,
        workload: workloadMap[emp.id] || 0,
        is_active: emp.is_active,
        email: emp.email
      }));
    },
  });
}

export function useAllAssignees() {
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployeesForAssignment();

  return {
    employees,
    isLoading: isLoadingEmployees
  };
}