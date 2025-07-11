import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
  assigned_user: { first_name: string; last_name: string } | null;
};

interface WorkOrderFilters {
  status?: string[];
  trade_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export function usePartnerWorkOrders(filters?: WorkOrderFilters) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['partner-work-orders', filters, profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile');

      // Get user's organizations first
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (userOrgsError) throw userOrgsError;
      
      const organizationIds = userOrgs.map(org => org.organization_id);
      
      if (organizationIds.length === 0) {
        return { data: [], totalCount: 0 };
      }

      let query = supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name),
          trades!trade_id(name),
          assigned_user:profiles!assigned_to(first_name, last_name)
        `, { count: 'exact' })
        .in('organization_id', organizationIds);

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['work_order_status'][]);
      }
      if (filters?.trade_id) {
        query = query.eq('trade_id', filters.trade_id);
      }
      if (filters?.search) {
        query = query.or(`work_order_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%,store_location.ilike.%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('date_submitted', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('date_submitted', filters.date_to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
      };
    },
    enabled: !!profile?.id,
  });
}

export function usePartnerWorkOrderStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['partner-work-order-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile');

      // Get user's organizations first
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (userOrgsError) throw userOrgsError;
      
      const organizationIds = userOrgs.map(org => org.organization_id);
      
      if (organizationIds.length === 0) {
        return {
          total: 0,
          active: 0,
          completedThisMonth: 0,
          avgCompletionDays: 0
        };
      }

      // Get all work orders for user's organizations
      const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select('status, date_submitted, date_completed')
        .in('organization_id', organizationIds);

      if (error) throw error;

      const total = workOrders.length;
      const active = workOrders.filter(wo => 
        ['received', 'assigned', 'in_progress'].includes(wo.status)
      ).length;

      // Completed this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const completedThisMonth = workOrders.filter(wo => 
        wo.status === 'completed' && 
        wo.date_completed && 
        new Date(wo.date_completed) >= thisMonth
      ).length;

      // Average completion time
      const completedWithDates = workOrders.filter(wo => 
        wo.status === 'completed' && wo.date_submitted && wo.date_completed
      );
      
      let avgCompletionDays = 0;
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, wo) => {
          const submitted = new Date(wo.date_submitted);
          const completed = new Date(wo.date_completed!);
          const diffDays = Math.ceil((completed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        avgCompletionDays = Math.round(totalDays / completedWithDates.length);
      }

      return {
        total,
        active,
        completedThisMonth,
        avgCompletionDays
      };
    },
    enabled: !!profile?.id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (workOrder: {
      title: string;
      store_location: string;
      street_address: string;
      city: string;
      state: string;
      zip_code: string;
      trade_id: string;
      description: string;
      organization_id: string;
      partner_po_number?: string;
      partner_location_number?: string;
    }) => {
      if (!profile?.id) throw new Error('No user profile');

      // Generate work order number
      const { data: workOrderNumber, error: numberError } = await supabase
        .rpc('generate_work_order_number');

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          ...workOrder,
          partner_po_number: workOrder.partner_po_number || null,
          partner_location_number: workOrder.partner_location_number || null,
          work_order_number: workOrderNumber,
          created_by: profile.id,
          status: 'received',
          date_submitted: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['partner-work-order-stats'] });
      toast({ 
        title: 'Work order submitted successfully', 
        description: `Work Order #${data.work_order_number} has been created.`
      });
      return data;
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating work order', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useWorkOrderById(id: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['work-order', id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile');

      // Get user's organizations first
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (userOrgsError) throw userOrgsError;
      
      const organizationIds = userOrgs.map(org => org.organization_id);

      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, contact_email, contact_phone),
          trades!trade_id(name, description),
          assigned_user:profiles!assigned_to(first_name, last_name),
          created_user:profiles!created_by(first_name, last_name)
        `)
        .eq('id', id)
        .in('organization_id', organizationIds)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !!id,
  });
}