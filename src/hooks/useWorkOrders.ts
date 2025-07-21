
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export function useWorkOrders(pagination: any, sorting: any, filters: any) {
  let { pageIndex, pageSize } = pagination;
  let { sortBy } = sorting;

  return useQuery({
    queryKey: ['work-orders', pagination, sorting, filters],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          organizations(name, organization_type),
          trades(name),
          assigned_user:profiles(first_name, last_name),
          assignments: work_order_assignments(
            id,
            assigned_to,
            assignment_type,
            assignee: profiles(first_name, last_name),
            assigned_organization: organizations(name, organization_type)
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

      return { data, pageCount, totalCount: count || 0 };
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
          organizations(name, contact_email),
          assigned_user:profiles(first_name, last_name)
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

export function useWorkOrderMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteWorkOrder = useMutation(
    async (id: string) => {
      const { data, error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return data;
    },
    {
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
    }
  );

  return { deleteWorkOrder };
}
