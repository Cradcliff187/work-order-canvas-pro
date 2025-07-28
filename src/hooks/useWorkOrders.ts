import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Base types from database
type WorkOrderRow = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];

// Simplified organization type - EXACT match with what Supabase returns
export interface WorkOrderOrganization {
  id: string;
  name: string;
  contact_email: string;
  organization_type?: 'partner' | 'subcontractor' | 'internal';
}

// Simplified trade type
export interface WorkOrderTrade {
  id: string;
  name: string;
}

// Simplified profile type
export interface WorkOrderProfile {
  id: string;
  first_name: string;
  last_name: string;
}

  // Main WorkOrder type - updated to match current database schema
export interface WorkOrder {
  id: string;
  work_order_number: string | null;
  title: string;
  description: string | null;
  organization_id: string | null;
  trade_id: string | null;
  status: 'received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved';
  estimated_hours: number | null;
  actual_hours: number | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  date_submitted: string;
  date_assigned: string | null;
  date_approved: string | null;
  date_completed: string | null;
  store_location: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  location_street_address: string | null;
  location_city: string | null;
  location_state: string | null;
  location_zip_code: string | null;
  location_name: string | null;
  partner_location_number: string | null;
  partner_po_number: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_organization_id: string | null;
  subcontractor_report_submitted: boolean | null;
  admin_completion_notes: string | null;
  final_completion_date: string | null;
  due_date: string | null;
  labor_cost: number | null;
  materials_cost: number | null;
  auto_completion_blocked: boolean | null;
  completion_checked_at: string | null;
  completion_method: string | null;
  location_address: string | null;
  subcontractor_invoice_amount: number | null;
  
  // Joined relations - must match exactly what the query returns
  organizations: WorkOrderOrganization | null;
  trades: WorkOrderTrade | null;
  attachment_count?: number;
  work_order_assignments?: Array<{
    id: string;
    assigned_to: string;
    assignment_type: string;
    notes?: string | null;
    profiles?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      user_type: 'admin' | 'employee' | 'partner' | 'subcontractor';
    } | null;
    organizations?: {
      id: string;
      name: string;
      initials: string;
      contact_email: string;
    } | null;
  }>;
}

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
          organizations!organization_id(id, name, contact_email, organization_type),
          trades!trade_id(id, name),
          work_order_attachments(count),
          work_order_assignments(
            id,
            assigned_to,
            assignment_type,
            assigned_organization_id,
            assigned_by,
            assigned_at,
            notes,
            profiles!work_order_assignments_assigned_to_fkey(
              id,
              first_name,
              last_name,
              email,
              user_type
            ),
            organizations!work_order_assignments_assigned_organization_id_fkey(
              id,
              name,
              initials,
              contact_email
            )
          )
        `,
          { count: 'exact' }
        )
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status as ('received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved')[]);
        }
        if (filters.trade_id) {
          query = query.eq('trade_id', filters.trade_id);
        }
        if (filters.organization_id) {
          query = query.eq('organization_id', filters.organization_id);
        }
        if (filters.search) {
          query = query.ilike('title', `%${filters.search}%`);
        }
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to);
        }
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
      
      // Transform the data to ensure type safety and add attachment count
      const transformedData = (data || []).map((wo: any) => ({
        ...wo,
        attachment_count: wo.work_order_attachments?.[0]?.count || 0
      })) as WorkOrder[];

      return {
        data: transformedData,
        pageCount,
        totalCount: count || 0,
      };
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
          organizations!organization_id(id, name, contact_email, organization_type),
          trades!trade_id(id, name),
          work_order_assignments(
            id,
            assigned_to,
            assignment_type,
            assigned_organization_id,
            assigned_by,
            assigned_at,
            notes,
            profiles!work_order_assignments_assigned_to_fkey(
              id,
              first_name,
              last_name,
              email,
              user_type
            ),
            organizations!work_order_assignments_assigned_organization_id_fkey(
              id,
              name,
              initials,
              contact_email
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as WorkOrder;
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
        .eq('organization_type', 'partner')
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
      // Generate work order number first
      let workOrderNumber: string;
      
      // Determine location code  
      let locationCode = workOrderData.partner_location_number;
      
      // If organization doesn't use partner location numbers, auto-generate
      if (!locationCode) {
        const { data: nextLocationCode, error: locationError } = await supabase.rpc(
          'generate_next_location_number',
          { org_id: workOrderData.organization_id! }
        );
        
        if (locationError) throw new Error(`Error generating location number: ${locationError.message}`);
        if (!nextLocationCode) throw new Error('Failed to generate location number');
        
        locationCode = nextLocationCode;
      }
      
      // Generate the actual work order number (this increments the sequence)
      const { data: generatedNumber, error: numberError } = await supabase.rpc(
        'generate_work_order_number_per_location',
        { 
          org_id: workOrderData.organization_id!,
          location_code: locationCode
        }
      );
      
      if (numberError) throw new Error(`Error generating work order number: ${numberError.message}`);
      if (!generatedNumber) throw new Error('Failed to generate work order number');
      
      workOrderNumber = generatedNumber;

      const { data, error } = await supabase
        .from('work_orders')
        .insert([{
          work_order_number: workOrderNumber,
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
          partner_location_number: locationCode,
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
