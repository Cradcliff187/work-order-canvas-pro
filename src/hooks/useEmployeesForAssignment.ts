import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssigneeData {
  id: string;
  first_name: string;
  last_name: string;
  type: 'employee' | 'subcontractor';
  organization: string;
  workload: number;
  is_active: boolean;
  company_name?: string;
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
        workload: workloadMap[emp.id] || 0,
        is_active: emp.is_active,
        email: emp.email
      }));
    },
  });
}

export function useAllAssignees(tradeId?: string) {
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployeesForAssignment();
  
  const { data: subcontractors = [], isLoading: isLoadingSubcontractors } = useQuery({
    queryKey: ['subcontractors-for-assignment', tradeId],
    queryFn: async (): Promise<AssigneeData[]> => {
      if (!tradeId) return [];
      
      const { data: subs, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'subcontractor')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      // Get workload for subcontractors
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

      return subs.map(sub => ({
        id: sub.id,
        first_name: sub.first_name,
        last_name: sub.last_name,
        type: 'subcontractor' as const,
        organization: sub.company_name || 'External',
        workload: workloadMap[sub.id] || 0,
        is_active: sub.is_active,
        company_name: sub.company_name || undefined,
        email: sub.email
      }));
    },
    enabled: !!tradeId,
  });

  return {
    employees,
    subcontractors,
    isLoading: isLoadingEmployees || isLoadingSubcontractors
  };
}