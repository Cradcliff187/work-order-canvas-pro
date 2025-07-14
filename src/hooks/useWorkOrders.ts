import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
  assigned_user: { first_name: string; last_name: string } | null;
  assignments?: Array<{
    id: string;
    assigned_to: string;
    assignment_type: string;
    assignee: {
      first_name: string;
      last_name: string;
    };
  }>;
};

interface WorkOrderFilters {
  status?: string[];
  trade_id?: string;
  organization_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface SortingState {
  id: string;
  desc: boolean;
}

/**
 * Fetches work orders with advanced filtering, pagination, and company-level access control
 * 
 * @param pagination - Page size and offset for results
 * @param sorting - Column sorting configuration
 * @param filters - Filter criteria for work orders
 * @returns Query result with work orders, pagination info, and organization details
 * 
 * Company Access Features:
 * - Organization-based access control via RLS policies
 * - Partners see work orders they submitted
 * - Subcontractors see work orders assigned to their organization
 * - Admins see all work orders across organizations
 * - Financial privacy maintained between companies
 * 
 * Access Patterns:
 * - Individual assignments: Legacy model for specific user assignments
 * - Organization assignments: Company-level assignments for team collaboration
 * - Mixed model: Supports both assignment types simultaneously
 */
export function useWorkOrders(
  pagination: PaginationState,
  sorting: SortingState[],
  filters: WorkOrderFilters
) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['work-orders', pagination, sorting, filters],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name),
          trades!trade_id(name),
          assigned_user:profiles!assigned_to(first_name, last_name),
          assignments:work_order_assignments(
            id,
            assigned_to,
            assignment_type,
            assignee:profiles!assigned_to(first_name, last_name),
            assigned_organization:organizations!assigned_organization_id(name, organization_type)
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['work_order_status'][]);
      }
      if (filters.trade_id) {
        query = query.eq('trade_id', filters.trade_id);
      }
      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }
      if (filters.search) {
        query = query.or(`work_order_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%,store_location.ilike.%${filters.search}%`);
      }
      if (filters.date_from) {
        query = query.gte('date_submitted', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('date_submitted', filters.date_to);
      }

      // Apply sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
        pageCount: Math.ceil((count || 0) / pagination.pageSize)
      };
    },
  });
}

export function useWorkOrderMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateWorkOrder = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkOrder> }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating work order', description: error.message, variant: 'destructive' });
    },
  });

  const createWorkOrder = useMutation({
    mutationFn: async (workOrder: Database['public']['Tables']['work_orders']['Insert']) => {
      const { data, error } = await supabase
        .from('work_orders')
        .insert(workOrder)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating work order', description: error.message, variant: 'destructive' });
    },
  });

  const deleteWorkOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting work order', description: error.message, variant: 'destructive' });
    },
  });

  const bulkUpdateWorkOrders = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<WorkOrder> }) => {
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .in('id', ids)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: `${data?.length} work orders updated successfully` });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating work orders', description: error.message, variant: 'destructive' });
    },
  });

  return {
    updateWorkOrder,
    createWorkOrder,
    deleteWorkOrder,
    bulkUpdateWorkOrders,
  };
}

export function useOrganizationsForWorkOrders() {
  const { user, profile, userOrganization } = useAuth();
  
  return useQuery({
    queryKey: ['organizations-simple', user?.id, profile?.user_type],
    queryFn: async () => {
      // For admins, return all active organizations
      if (profile?.user_type === 'admin') {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, initials, organization_type')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        return data || [];
      }

      // For non-admin users, return only their organization
      if (!userOrganization) {
        return [];
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, initials, organization_type')
        .eq('id', userOrganization.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!profile,
  });
}

export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, user_type')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });
}