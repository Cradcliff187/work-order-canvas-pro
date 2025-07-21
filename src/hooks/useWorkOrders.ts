
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderRow = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];

export type WorkOrder = WorkOrderRow & {
  organizations: { name: string; organization_type?: string } | null;
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
    assigned_organization?: {
      name: string;
      organization_type?: 'partner' | 'subcontractor' | 'internal';
    } | null;
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

export function useWorkOrders(
  pagination: { pageIndex: number; pageSize: number }, 
  sorting: { sortBy: Array<{ id: string; desc: boolean }> }, 
  filters: WorkOrderFilters
) {
  const { pageIndex, pageSize } = pagination;
  const { sortBy } = sorting;

  return useQuery({
    queryKey: ['work-orders', pagination, sorting, filters],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, organization_type),
          trades!trade_id(name),
          assigned_user:profiles!assigned_to(first_name, last_name),
          assignments: work_order_assignments(
            id,
            assigned_to,
            assignment_type,
            assignee: profiles!work_order_assignments_assigned_to_fkey(first_name, last_name),
            assigned_organization: organizations!work_order_assignments_assigned_organization_id_fkey(name, organization_type)
          )
        `,
          { count: 'exact' }
        )
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            if (Array.isArray(value)) {
              if (value.length > 0) {
                query = query.in(key, value);
              }
            } else if (typeof value === 'string') {
              if (key === 'search') {
                query = query.ilike('title', `%${value}%`);
              } else {
                query = query.eq(key, value);
              }
            } else if (key === 'date_from' && filters.date_to) {
              query = query.gte('created_at', value);
            } else if (key === 'date_to' && filters.date_from) {
              query = query.lte('created_at', value);
            }
          }
        });
      }

      // Apply sorting
      if (sortBy && sortBy.length > 0) {
        sortBy.forEach((sort) => {
          query = query.order(sort.id, { ascending: !sort.desc });
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const pageCount = count ? Math.ceil(count / pageSize) : 0;

      return { data: data || [], pageCount, totalCount: count || 0 };
    },
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, contact_email, organization_type),
          trades!trade_id(name),
          assigned_user:profiles!assigned_to(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useOrganizationsForWorkOrders() {
  return useQuery({
    queryKey: ['organizations-for-work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, organization_type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workOrderData: Partial<WorkOrderInsert>) => {
      const { data, error } = await supabase
        .from('work_orders')
        .insert([{
          title: workOrderData.title!,
          description: workOrderData.description || '',
          organization_id: workOrderData.organization_id!,
          trade_id: workOrderData.trade_id!,
          store_location: workOrderData.store_location || '',
          street_address: workOrderData.street_address || '',
          city: workOrderData.city || '',
          state: workOrderData.state || '',
          zip_code: workOrderData.zip_code || '',
          partner_po_number: workOrderData.partner_po_number || '',
          partner_location_number: workOrderData.partner_location_number || '',
          status: 'received',
          created_by: workOrderData.created_by!,
          date_submitted: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({
        title: 'Success',
        description: 'Work order created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create work order',
      });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WorkOrderUpdate>) => {
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
      queryClient.invalidateQueries({ queryKey: ['work-order'] });
      toast({
        title: 'Success',
        description: 'Work order updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update work order',
      });
    },
  });
}

export function useWorkOrderMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteWorkOrder = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({
        title: 'Success',
        description: 'Work order deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  return { deleteWorkOrder };
}
