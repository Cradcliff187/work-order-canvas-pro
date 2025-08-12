import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceFilters {
  status?: string[];
  paymentStatus?: 'paid' | 'unpaid';
  search?: string;
  page?: number;
  limit?: number;
  organization_id?: string; // partner organization (via related work order)
  trade_id?: string[];
  location_filter?: string[];
  date_from?: string;
  date_to?: string;
  overdue?: boolean;
  created_today?: boolean;
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
    const key = {
      status: (filters.status || []).join(','),
      paymentStatus: filters.paymentStatus || 'any',
      search: filters.search || '',
      organization_id: filters.organization_id || 'all',
      trade_id: (filters.trade_id || []).join(','),
      location_filter: (filters.location_filter || []).join(','),
      date_from: filters.date_from || '',
      date_to: filters.date_to || '',
      overdue: !!filters.overdue,
      created_today: !!filters.created_today,
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
    return ['invoices', key] as const;
  }, [
    (filters.status || []).join(','),
    filters.paymentStatus,
    filters.search,
    filters.organization_id,
    (filters.trade_id || []).join(','),
    (filters.location_filter || []).join(','),
    filters.date_from,
    filters.date_to,
    filters.overdue,
    filters.created_today,
    filters.page,
    filters.limit,
  ]);


  return useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
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

      // Apply status filter
      if (otherFilters.status && otherFilters.status.length > 0) {
        query = query.in('status', otherFilters.status);
      }

      // Apply payment status filter
      if (otherFilters.paymentStatus === 'paid') {
        query = query.not('paid_at', 'is', null);
      } else if (otherFilters.paymentStatus === 'unpaid') {
        query = query.is('paid_at', null);
      }

      // Apply partner organization filter (via related work orders)
      if (otherFilters.organization_id) {
        query = query.eq('invoice_work_orders.work_orders.organization_id', otherFilters.organization_id);
      }

      // Apply trade filter (via related work orders)
      if (otherFilters.trade_id && otherFilters.trade_id.length > 0) {
        query = query.in('invoice_work_orders.work_orders.trade_id', otherFilters.trade_id);
      }

      // Apply location filter (via related work orders)
      if (otherFilters.location_filter && otherFilters.location_filter.length > 0) {
        const locOr = otherFilters.location_filter.map(loc => `invoice_work_orders.work_orders.store_location.ilike.%${loc}%`).join(',');
        query = query.or(locOr);
      }

      // Apply search filter (search both internal and external invoice numbers)
      if (otherFilters.search) {
        query = query.or(
          `internal_invoice_number.ilike.%${otherFilters.search}%,external_invoice_number.ilike.%${otherFilters.search}%`
        );
      }

      // Date range on invoice created_at
      if (otherFilters.date_from) {
        query = query.gte('created_at', otherFilters.date_from);
      }
      if (otherFilters.date_to) {
        query = query.lte('created_at', otherFilters.date_to);
      }

      // Overdue: due_date < today and unpaid
      if (otherFilters.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_date', today).is('paid_at', null);
      }

      // Created today
      if (otherFilters.created_today) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query = query.gte('created_at', today).lt('created_at', tomorrow);
      }
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.code === 'PGRST116' || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
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