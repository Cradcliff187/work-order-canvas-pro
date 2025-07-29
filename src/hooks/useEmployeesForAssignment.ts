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
      // Get active employees from internal organizations
      const { data: employees, error } = await supabase
        .from('profiles')
        .select(`
          *,
          organization_memberships!inner(
            organization:organizations!inner(
              name,
              organization_type
            )
          )
        `)
        .eq('organization_memberships.organizations.organization_type', 'internal')
        .eq('is_employee', true)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      // Get workload for employees from assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('work_order_assignments')
        .select(`
          assigned_to,
          work_orders!inner(status)
        `)
        .in('work_orders.status', ['assigned', 'in_progress']);

      if (assignmentError) throw assignmentError;

      // Calculate workload
      const workloadMap = (assignments || []).reduce((acc, assignment) => {
        if (assignment.assigned_to) {
          acc[assignment.assigned_to] = (acc[assignment.assigned_to] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return employees.map(emp => {
        const primaryOrg = (emp as any).organization_memberships?.[0]?.organization;
        return {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          type: 'employee' as const,
          organization: primaryOrg?.name || 'Internal',
          organization_id: primaryOrg?.id,
          workload: workloadMap[emp.id] || 0,
          is_active: emp.is_active,
          email: emp.email
        };
      });
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