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

export function useAllAssignees(tradeId?: string, showAllSubcontractors: boolean = false) {
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployeesForAssignment();
  
  const { data: subcontractors = [], isLoading: isLoadingSubcontractors } = useQuery({
    queryKey: ['subcontractor-organizations-for-assignment'],
    queryFn: async (): Promise<AssigneeData[]> => {
      console.log('🔍 Subcontractor Organizations Query Debug - simplified key');
      
      // Always fetch all subcontractor organizations
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');

      console.log('📊 Raw subcontractor organization query result:', { orgs, error, count: orgs?.length });

      if (error) throw error;

      // Get workload for subcontractor organizations (count work orders assigned to their organization)
      const { data: workOrders, error: workOrderError } = await supabase
        .from('work_order_assignments')
        .select('assigned_organization_id')
        .not('assigned_organization_id', 'is', null)
        .in('assigned_organization_id', orgs?.map(org => org.id) || []);

      if (workOrderError) throw workOrderError;

      // Calculate workload per organization
      const workloadMap = workOrders.reduce((acc, woa) => {
        if (woa.assigned_organization_id) {
          acc[woa.assigned_organization_id] = (acc[woa.assigned_organization_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const result = (orgs || []).map(org => ({
        id: org.id, // Use organization ID as the assignee ID
        first_name: org.name,
        last_name: '', // Empty for organizations
        type: 'subcontractor' as const,
        organization: org.name,
        organization_id: org.id,
        workload: workloadMap[org.id] || 0,
        is_active: org.is_active,
        email: org.contact_email
      }));
      
      console.log('✅ Final subcontractor organization result:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    employees,
    subcontractors,
    isLoading: isLoadingEmployees || isLoadingSubcontractors
  };
}