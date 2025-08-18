import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceFiltersValue } from '@/components/admin/invoices/InvoiceFilters';

export interface InvoiceFilters extends InvoiceFiltersValue {
  page?: number;
  limit?: number;
}


export interface Invoice {
  id: string;
  internal_invoice_number: string;
  external_invoice_number: string | null;
  subcontractor_organization_id: string;
  submitted_by: string;
  total_amount: number;
  status: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  approval_notes: string | null;
  admin_notes: string | null;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
  attachment_count?: number;
  subcontractor_organization: {
    id: string;
    name: string;
  };
  submitted_by_user: {
    id: string;
    first_name: string;
    last_name: string;
  };
  approved_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_by_admin?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  invoice_work_orders: Array<{
    id: string;
    work_order_id: string;
    amount: number;
    description: string | null;
    work_order: {
      id: string;
      work_order_number: string | null;
      title: string;
    };
  }>;
  invoice_attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number | null;
    created_at: string;
  }>;
}

export const useInvoices = (filters: InvoiceFilters = {}) => {
  // Stabilize query key to prevent unnecessary re-fetches
  const stableQueryKey = useMemo(() => {
    // Serialize complex objects to ensure stability
    const key = {
      search: filters.search || '',
      overdue: filters.overdue ? 'true' : 'false',
      partner_organization_id: filters.partner_organization_id || 'all',
      location_filter: (filters.location_filter || []).sort().join(','),
      subcontractor_organization_id: filters.subcontractor_organization_id || 'all',
      operational_status: (filters.operational_status || []).sort().join(','),
      report_status: (filters.report_status || []).sort().join(','),
      invoice_status: (filters.invoice_status || []).sort().join(','),
      partner_billing_status: (filters.partner_billing_status || []).sort().join(','),
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    return ['invoices', key] as const;
  }, [
    filters.search,
    filters.overdue,
    filters.partner_organization_id,
    filters.location_filter?.sort().join(','),
    filters.subcontractor_organization_id,
    filters.operational_status?.sort().join(','),
    filters.report_status?.sort().join(','),
    filters.invoice_status?.sort().join(','),
    filters.partner_billing_status?.sort().join(','),
    filters.page,
    filters.limit,
  ]);


  return useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
      console.log('📡 Fetching invoices with filters:', filters);
      const { page = 1, limit = 10, ...otherFilters } = filters;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('invoices')
        .select(`
          *,
          subcontractor_organization:organizations!subcontractor_organization_id(
            id,
            name
          ),
          submitted_by_user:profiles!submitted_by(
            id,
            first_name,
            last_name
          ),
          approved_by_user:profiles!approved_by(
            id,
            first_name,
            last_name
          ),
          created_by_admin:profiles!created_by_admin_id(
            id,
            first_name,
            last_name
          ),
          invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_order:work_orders(
              id,
              work_order_number,
              title,
              organization_id,
              trade_id,
              store_location
            )
          ),
          attachment_count:invoice_attachments(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // TODO: Apply invoice status filter (phase 4)
      // TODO: Apply payment status filter (phase 4)

      // Apply subcontractor organization filter (direct field on invoice)
      if (otherFilters.subcontractor_organization_id) {
        query = query.eq('subcontractor_organization_id', otherFilters.subcontractor_organization_id);
      }

      // Apply partner organization filter (via related work orders) - complex filtering
      if (otherFilters.partner_organization_id) {
        // Get work order IDs for this partner organization first
        const { data: workOrderIds } = await supabase
          .from('work_orders')
          .select('id')
          .eq('organization_id', otherFilters.partner_organization_id);
        
        if (workOrderIds && workOrderIds.length > 0) {
          // Get invoice IDs that have these work orders
          const { data: invoiceIds } = await supabase
            .from('invoice_work_orders')
            .select('invoice_id')
            .in('work_order_id', workOrderIds.map(wo => wo.id));
          
          if (invoiceIds && invoiceIds.length > 0) {
            query = query.in('id', invoiceIds.map(iwo => iwo.invoice_id));
          } else {
            // No invoices for this partner - return empty result
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          // No work orders for this partner - return empty result
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      // TODO: Apply operational status filter (phase 4)
      // TODO: Apply report status filter (phase 4)

      // Apply location filter (via related work orders)
      if (otherFilters.location_filter && otherFilters.location_filter.length > 0) {
        const locationSearchTerms = otherFilters.location_filter.map(loc => `invoice_work_orders.work_orders.store_location.ilike.%${loc.trim()}%`).join(',');
        query = query.or(locationSearchTerms);
      }

      // Apply search filter (search both internal and external invoice numbers)
      if (otherFilters.search) {
        const searchTerm = `%${otherFilters.search.trim()}%`;
        query = query.or(`internal_invoice_number.ilike.${searchTerm},external_invoice_number.ilike.${searchTerm}`);
      }

      // TODO: Apply date filters (phase 4)

      // Overdue: due_date < today and unpaid
      if (otherFilters.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_date', today).is('paid_at', null);
      }

      // TODO: Apply partner billing status filter (phase 4)
      // TODO: Apply amount filters (phase 4)
      // TODO: Apply attachment filters (phase 4)
      // TODO: Apply date range filters (phase 4)
      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      // Transform attachment count and coerce numeric fields to numbers
      const transformedData = (data || []).map((invoice) => {
        const normalizeNumber = (v: any) => (typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : 0));
        return {
          ...invoice,
          attachment_count: Array.isArray(invoice.attachment_count) 
            ? (invoice.attachment_count[0]?.count || 0)
            : (invoice.attachment_count || 0),
          total_amount: normalizeNumber((invoice as any).total_amount),
          invoice_work_orders: (invoice as any).invoice_work_orders?.map((item: any) => ({
            ...item,
            amount: normalizeNumber(item.amount),
          })) || [],
        };
      });

      return {
        data: transformedData as Invoice[],
        count: count || 0,
      };
    },
    enabled: true,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes (renamed from cacheTime in v5) 
    refetchOnMount: true, // Allow initial mount fetch
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.code === 'PGRST116' || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 2; // Reduced retry attempts
    },
    retryOnMount: true,
    placeholderData: (previousData) => previousData, // v5 syntax for keepPreviousData
  });
};

export const useInvoice = (id: string) => {
  const stableQueryKey = useMemo(() => ['invoice', id], [id]);

  return useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subcontractor_organization:organizations!subcontractor_organization_id(
            id,
            name,
            contact_email,
            contact_phone
          ),
          submitted_by_user:profiles!submitted_by(
            id,
            first_name,
            last_name,
            email
          ),
          approved_by_user:profiles!approved_by(
            id,
            first_name,
            last_name
          ),
          created_by_admin:profiles!created_by_admin_id(
            id,
            first_name,
            last_name
          ),
          invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_order:work_orders(
              id,
              work_order_number,
              title,
              status,
              organization_id
            )
          ),
          invoice_attachments(
            id,
            file_name,
            file_url,
            file_type,
            file_size,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching invoice:', error);
        throw error;
      }

      return data as Invoice;
    },
    enabled: !!id && id !== 'skip-query',
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST116' || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};