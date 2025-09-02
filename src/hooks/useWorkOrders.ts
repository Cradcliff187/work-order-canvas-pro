import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
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
  priority: 'standard' | 'urgent';
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
  subcontractor_bill_amount: number | null;
  
  // Estimate tracking fields
  internal_estimate_amount: number | null;
  internal_estimate_description: string | null;
  internal_estimate_notes: string | null;
  internal_estimate_created_at: string | null;
  internal_estimate_created_by: string | null;
  internal_estimate_approved: boolean | null;
  internal_estimate_approved_at: string | null;
  internal_estimate_approved_by: string | null;
  internal_markup_percentage: number | null;
  subcontractor_estimate_amount: number | null;
  subcontractor_estimate_description: string | null;
  subcontractor_estimate_submitted_at: string | null;
  subcontractor_estimate_submitted_by: string | null;
  subcontractor_estimate_approved: boolean | null;
  subcontractor_estimate_approved_at: string | null;
  subcontractor_estimate_approved_by: string | null;
  partner_estimate_approved: boolean | null;
  partner_estimate_approved_at: string | null;
  partner_estimate_rejection_notes: string | null;
  
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
    } | null;
    organizations?: {
      id: string;
      name: string;
      initials: string;
      contact_email: string;
    } | null;
  }>;
}

export interface WorkOrderFilters {
  status?: string[];
  trade_id?: string[];
  partner_organization_ids?: string[]; // Partner orgs multi-select
  assigned_to?: string[]; // 'internal' and/or subcontractor org UUIDs
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
  priority?: string[];
  unassigned?: boolean;
  created_today?: boolean;
}

export function useWorkOrders(
  pagination: { pageIndex: number; pageSize: number }, 
  sorting: { sortBy: Array<{ id: string; desc: boolean }> }, 
  filters: WorkOrderFilters
) {
  const { pageIndex, pageSize } = pagination;
  const { sortBy } = sorting;
  const { user, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['work-orders', pagination, sorting, filters, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user found');

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
              email
            ),
            organizations!work_order_assignments_assigned_organization_id_fkey(
              id,
              name,
              initials,
              contact_email,
              organization_type
            )
          )
        `,
          { count: 'exact' }
        );

      // Apply organization-based filtering
      if (isAdmin() || isEmployee()) {
        // Internal users see all work orders - no additional filtering needed
      } else if (isPartner()) {
        // Partners see only their organization's work orders
        const orgIds = userOrganizations?.map(org => org.organization_id) || [];
        
        if (orgIds.length > 0) {
          query = query.in('organization_id', orgIds);
        } else {
          // No organizations, return empty results
          return { data: [], pageCount: 0, totalCount: 0 };
        }
      } else if (isSubcontractor()) {
        // Subcontractors see only assigned work orders
        const orgIds = userOrganizations?.map(org => org.organization_id) || [];
        
        if (orgIds.length > 0) {
          query = query.in('assigned_organization_id', orgIds);
        } else {
          // No organizations, return empty results
          return { data: [], pageCount: 0, totalCount: 0 };
        }
      }

      query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status as ('received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved')[]);
        }
        if (filters.trade_id && filters.trade_id.length > 0) {
          query = query.in('trade_id', filters.trade_id);
        }
        if (filters.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority as ('standard' | 'urgent')[]);
        }
        if (filters.partner_organization_ids && filters.partner_organization_ids.length > 0) {
          query = query.in('organization_id', filters.partner_organization_ids as any);
        }
        if (filters.search) {
          const searchTerm = `%${filters.search.trim()}%`;
          query = query.or(`work_order_number.ilike.${searchTerm},title.ilike.${searchTerm},store_location.ilike.${searchTerm}`);
        }
        if (filters.location_filter && filters.location_filter.length > 0) {
          // Escape special SQL wildcard characters to prevent injection
          const safeLocations = filters.location_filter.map(loc => 
            loc.replace(/[%_\\]/g, '\\$&')  // Escapes %, _, and \ characters
          );
          
          // Build OR conditions for both store_location and partner_location_number
          const conditions = safeLocations
            .map(loc => `store_location.ilike.%${loc}%,partner_location_number.ilike.%${loc}%`)
            .join(',');
          
          query = query.or(conditions);
        }
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to);
        }
        // Filter by who is assigned to the work (Internal team and/or specific subcontractors)
        if (filters.assigned_to && filters.assigned_to.length > 0) {
          const selections = filters.assigned_to;
          const includesInternal = selections.includes('internal');
          const subOrgIds = selections.filter((id) => id !== 'internal');

          let workOrderIds: string[] = [];

          // Handle internal organization filtering
          if (includesInternal) {
            // Get the internal organization ID
            const { data: internalOrg } = await supabase
              .from('organizations')
              .select('id')
              .eq('organization_type', 'internal')
              .single();

            if (internalOrg) {
              // Get assignments to internal org or direct employee assignments
              const { data: internalAssignments } = await supabase
                .from('work_order_assignments')
                .select('work_order_id')
                .or(`assigned_organization_id.eq.${internalOrg.id},assigned_organization_id.is.null`);

              if (internalAssignments) {
                workOrderIds.push(...internalAssignments.map(a => a.work_order_id));
              }
            }
          }

          // Handle subcontractor organization filtering
          if (subOrgIds.length > 0) {
            const { data: subAssignments } = await supabase
              .from('work_order_assignments')
              .select('work_order_id')
              .in('assigned_organization_id', subOrgIds);

            if (subAssignments) {
              workOrderIds.push(...subAssignments.map(a => a.work_order_id));
            }
          }

          if (workOrderIds.length > 0) {
            // Remove duplicates and filter the main query
            const uniqueWorkOrderIds = [...new Set(workOrderIds)];
            query = query.in('id', uniqueWorkOrderIds);
          } else {
            // No matching assignments, return empty results
            return { data: [], pageCount: 0, totalCount: 0 };
          }
        }
        
        // Quick filter: Unassigned - no assignments
        if (filters.unassigned) {
          query = query.is('work_order_assignments.assigned_to', null);
        }
        
        // Quick filter: Today - work orders created today
        if (filters.created_today) {
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          query = query.gte('created_at', today).lt('created_at', tomorrow);
        }
      }

      // Apply sorting
      if (sortBy && sortBy.length > 0) {
        sortBy.forEach((sort) => {
          const mapping: Record<string, { column: string; foreignTable?: string }> = {
            work_order_number: { column: 'work_order_number' },
            title: { column: 'title' },
            store_location: { column: 'store_location' },
            priority: { column: 'priority' },
            status: { column: 'status' },
            date_submitted: { column: 'date_submitted' },
            organization: { column: 'name', foreignTable: 'organizations' },
            trade: { column: 'name', foreignTable: 'trades' },
          };

          const cfg = mapping[sort.id];
          if (!cfg) {
            // Unsupported for server-side (e.g., assigned_to) — skip and let client-side sorting handle current page
            return;
          }

          if (cfg.foreignTable) {
            // Order by related table column
            query = query.order(cfg.column, { ascending: !sort.desc, foreignTable: cfg.foreignTable as any });
          } else {
            query = query.order(cfg.column, { ascending: !sort.desc });
          }
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // DEBUG: Log the query before execution
      console.log('DEBUG useWorkOrders - Query about to execute');
      
      try {
        const { data, error, count } = await query;
        
        if (error) {
          console.error('DEBUG useWorkOrders - Supabase error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('DEBUG useWorkOrders - Query executed successfully, data count:', data?.length, 'total count:', count);
        
        const pageCount = count ? Math.ceil(count / pageSize) : 0;
        
        // Transform the data to ensure type safety and add attachment count
        const transformedData = (data || []).map((wo: any) => ({
          ...wo,
          attachment_count: wo.work_order_attachments?.[0]?.count || 0,
          // Ensure all fields are properly typed (set null if undefined)
          subcontractor_bill_amount: wo.subcontractor_bill_amount ?? null,
          // Ensure all estimate fields are properly typed (set null if undefined)
          internal_estimate_amount: wo.internal_estimate_amount ?? null,
          internal_estimate_description: wo.internal_estimate_description ?? null,
          internal_estimate_notes: wo.internal_estimate_notes ?? null,
          internal_estimate_created_at: wo.internal_estimate_created_at ?? null,
          internal_estimate_created_by: wo.internal_estimate_created_by ?? null,
          internal_estimate_approved: wo.internal_estimate_approved ?? null,
          internal_estimate_approved_at: wo.internal_estimate_approved_at ?? null,
          internal_estimate_approved_by: wo.internal_estimate_approved_by ?? null,
          internal_markup_percentage: wo.internal_markup_percentage ?? null,
          subcontractor_estimate_amount: wo.subcontractor_estimate_amount ?? null,
          subcontractor_estimate_description: wo.subcontractor_estimate_description ?? null,
          subcontractor_estimate_submitted_at: wo.subcontractor_estimate_submitted_at ?? null,
          subcontractor_estimate_submitted_by: wo.subcontractor_estimate_submitted_by ?? null,
          subcontractor_estimate_approved: wo.subcontractor_estimate_approved ?? null,
          subcontractor_estimate_approved_at: wo.subcontractor_estimate_approved_at ?? null,
          subcontractor_estimate_approved_by: wo.subcontractor_estimate_approved_by ?? null,
          partner_estimate_approved: wo.partner_estimate_approved ?? null,
          partner_estimate_approved_at: wo.partner_estimate_approved_at ?? null,
          partner_estimate_rejection_notes: wo.partner_estimate_rejection_notes ?? null,
        })) as WorkOrder[];

        return {
          data: transformedData,
          pageCount,
          totalCount: count || 0,
        };
      } catch (err) {
        console.error('DEBUG useWorkOrders - Full error object:', err);
        throw err;
      }
    },
    enabled: !!user,
  });

  // Real-time subscription for work order updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('work-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('Work order updated via realtime:', payload);
          
          // Debounced refetch to prevent excessive API calls
          const timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: ['work-orders'],
            });
          }, 500);

          return () => clearTimeout(timeoutId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_orders',
        },
        (payload) => {
          console.log('New work order created via realtime:', payload);
          
          const timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: ['work-orders'],
            });
          }, 500);

          return () => clearTimeout(timeoutId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useWorkOrder(id: string) {
  const { user, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  return useQuery({
    queryKey: ['work-order', id, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user found');
      let query = supabase
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
              email
            ),
            organizations!work_order_assignments_assigned_organization_id_fkey(
              id,
              name,
              initials,
              contact_email
            )
          )
        `)
        .eq('id', id);

      // Apply organization-based filtering
      if (isAdmin() || isEmployee()) {
        // Internal users can access any work order
      } else if (isPartner()) {
        // Partners can only access their organization's work orders
        const orgIds = userOrganizations?.map(org => org.organization_id) || [];
        
        if (orgIds.length > 0) {
          query = query.in('organization_id', orgIds);
        } else {
          throw new Error('No access to this work order');
        }
      } else if (isSubcontractor()) {
        // Subcontractors can only access assigned work orders
        const orgIds = userOrganizations?.map(org => org.organization_id) || [];
        
        if (orgIds.length > 0) {
          query = query.in('assigned_organization_id', orgIds);
        } else {
          throw new Error('No access to this work order');
        }
      }

      const { data, error } = await query.single();

      if (error) throw error;
      
      // Transform the data to ensure type safety with estimate fields
      const transformedData = {
        ...data,
        // Ensure all fields are properly typed (set null if undefined)
        subcontractor_bill_amount: (data as any).subcontractor_bill_amount ?? null,
        // Ensure all estimate fields are properly typed (set null if undefined)
        internal_estimate_amount: (data as any).internal_estimate_amount ?? null,
        internal_estimate_description: (data as any).internal_estimate_description ?? null,
        internal_estimate_notes: (data as any).internal_estimate_notes ?? null,
        internal_estimate_created_at: (data as any).internal_estimate_created_at ?? null,
        internal_estimate_created_by: (data as any).internal_estimate_created_by ?? null,
        internal_estimate_approved: (data as any).internal_estimate_approved ?? null,
        internal_estimate_approved_at: (data as any).internal_estimate_approved_at ?? null,
        internal_estimate_approved_by: (data as any).internal_estimate_approved_by ?? null,
        internal_markup_percentage: (data as any).internal_markup_percentage ?? null,
        subcontractor_estimate_amount: (data as any).subcontractor_estimate_amount ?? null,
        subcontractor_estimate_description: (data as any).subcontractor_estimate_description ?? null,
        subcontractor_estimate_submitted_at: (data as any).subcontractor_estimate_submitted_at ?? null,
        subcontractor_estimate_submitted_by: (data as any).subcontractor_estimate_submitted_by ?? null,
        subcontractor_estimate_approved: (data as any).subcontractor_estimate_approved ?? null,
        subcontractor_estimate_approved_at: (data as any).subcontractor_estimate_approved_at ?? null,
        subcontractor_estimate_approved_by: (data as any).subcontractor_estimate_approved_by ?? null,
        partner_estimate_approved: (data as any).partner_estimate_approved ?? null,
        partner_estimate_approved_at: (data as any).partner_estimate_approved_at ?? null,
        partner_estimate_rejection_notes: (data as any).partner_estimate_rejection_notes ?? null,
      } as WorkOrder;
      
      return transformedData;
    },
    enabled: !!id && !!user,
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
    onMutate: async (workOrderId) => {
      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['work-orders'] });
      await queryClient.cancelQueries({ queryKey: ['work-order', workOrderId] });
      await queryClient.cancelQueries({ queryKey: ['organization-work-orders'] });
      
      // Get previous data for rollback
      const previousWorkOrders = queryClient.getQueryData(['work-orders']);
      const previousWorkOrder = queryClient.getQueryData(['work-order', workOrderId]);
      const previousOrgWorkOrders = queryClient.getQueryData(['organization-work-orders']);
      
      // Optimistically remove work order from cache
      removeWorkOrderFromCache(queryClient, workOrderId);
      
      return { previousWorkOrders, previousWorkOrder, previousOrgWorkOrders };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({
        title: 'Success',
        description: 'Work order deleted successfully',
      });
    },
    onError: (error: any, workOrderId, context) => {
      // Rollback optimistic updates
      if (context?.previousWorkOrders) {
        queryClient.setQueryData(['work-orders'], context.previousWorkOrders);
      }
      if (context?.previousWorkOrder) {
        queryClient.setQueryData(['work-order', workOrderId], context.previousWorkOrder);
      }
      if (context?.previousOrgWorkOrders) {
        queryClient.setQueryData(['organization-work-orders'], context.previousOrgWorkOrders);
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const bulkUpdateWorkOrders = useMutation({
    mutationFn: async ({ 
      workOrderIds, 
      updates 
    }: { 
      workOrderIds: string[]; 
      updates: Partial<WorkOrderInsert> 
    }) => {
      // Perform bulk update
      const { data, error } = await supabase
        .from('work_orders')
        .update(updates)
        .in('id', workOrderIds)
        .select();

      if (error) throw new Error(error.message);
      return { data, updatedCount: workOrderIds.length };
    },
    onMutate: async ({ workOrderIds, updates }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['work-orders'] });
      await queryClient.cancelQueries({ queryKey: ['organization-work-orders'] });
      
      // Get previous data for rollback
      const previousWorkOrders = queryClient.getQueryData(['work-orders']);
      const previousOrgWorkOrders = queryClient.getQueryData(['organization-work-orders']);
      
      // Optimistically update work orders in cache
      queryClient.setQueriesData({ queryKey: ['work-orders'] }, (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        return {
          ...oldData,
          data: oldData.data.map((wo: any) => 
            workOrderIds.includes(wo.id) 
              ? { ...wo, ...updates, updated_at: new Date().toISOString() }
              : wo
          )
        };
      });
      
      return { previousWorkOrders, previousOrgWorkOrders };
    },
    onSuccess: (result) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['organization-work-orders'] });
      
      toast({
        title: 'Success',
        description: `Successfully updated ${result.updatedCount} work order${result.updatedCount > 1 ? 's' : ''}`,
      });
    },
    onError: (error: any, { workOrderIds }, context) => {
      // Rollback optimistic updates
      if (context?.previousWorkOrders) {
        queryClient.setQueryData(['work-orders'], context.previousWorkOrders);
      }
      if (context?.previousOrgWorkOrders) {
        queryClient.setQueryData(['organization-work-orders'], context.previousOrgWorkOrders);
      }
      
      toast({
        variant: 'destructive',
        title: 'Bulk Update Failed',
        description: error.message || 'Failed to update work orders. Please try again.',
      });
    },
  });

  return { deleteWorkOrder, bulkUpdateWorkOrders };
}

// Helper function to remove work order from cache
function removeWorkOrderFromCache(queryClient: ReturnType<typeof useQueryClient>, workOrderId: string) {
  queryClient.setQueriesData({ queryKey: ['work-orders'] }, (oldData: any) => {
    if (!oldData?.data) return oldData;
    
    return {
      ...oldData,
      data: oldData.data.filter((wo: any) => wo.id !== workOrderId),
      totalCount: Math.max(0, (oldData.totalCount || 0) - 1)
    };
  });
  
  // Remove individual work order
  queryClient.removeQueries({ queryKey: ['work-order', workOrderId] });
  
  // Update organization work orders
  queryClient.setQueriesData({ queryKey: ['organization-work-orders'] }, (oldData: any) => {
    if (!oldData) return oldData;
    
    return oldData.filter((wo: any) => wo.id !== workOrderId);
  });
}
