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
      status?: string;
      organization_id?: string;
      store_location?: string | null;
      organizations?: {
        id: string;
        name: string;
      } | null;
      latest_report?: {
        id: string;
        status: string;
        submitted_at: string | null;
        reviewed_at: string | null;
      } | null;
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
              status,
              organization_id,
              store_location,
              organizations!work_orders_organization_id_fkey(
                id,
                name
              ),
              latest_report:work_order_reports(
                id,
                status,
                submitted_at,
                reviewed_at
              )
            )
          ),
          attachment_count:invoice_attachments(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply invoice status filter (direct on invoice.status field)
      if (otherFilters.invoice_status && otherFilters.invoice_status.length > 0) {
        query = query.in('status', otherFilters.invoice_status);
      }

      // Apply subcontractor organization filter (direct field on invoice)
      if (otherFilters.subcontractor_organization_id) {
        query = query.eq('subcontractor_organization_id', otherFilters.subcontractor_organization_id);
      }

      // Server-side filters are limited - complex filters handled client-side below


      // Location and other complex filters handled client-side below

      // Apply search filter (search both internal and external invoice numbers)
      if (otherFilters.search) {
        const searchTerm = `%${otherFilters.search.trim()}%`;
        query = query.or(`internal_invoice_number.ilike.${searchTerm},external_invoice_number.ilike.${searchTerm}`);
      }

      

      // Overdue: due_date < today and unpaid
      if (otherFilters.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_date', today).is('paid_at', null);
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

      // Apply client-side filters for complex relationships
      let filteredData = transformedData;

      // Filter by partner organization (through work orders)
      if (otherFilters.partner_organization_id && otherFilters.partner_organization_id !== 'all') {
        filteredData = filteredData.filter(invoice => 
          invoice.invoice_work_orders.some(iwo => 
            iwo.work_order.organization_id === otherFilters.partner_organization_id
          )
        );
      }

      // Filter by location (through work orders)  
      if (otherFilters.location_filter && otherFilters.location_filter.length > 0) {
        filteredData = filteredData.filter(invoice =>
          invoice.invoice_work_orders.some(iwo =>
            otherFilters.location_filter!.some(location =>
              iwo.work_order.store_location?.toLowerCase().includes(location.toLowerCase())
            )
          )
        );
      }

      // Filter by operational status (through work orders)
      if (otherFilters.operational_status && otherFilters.operational_status.length > 0) {
        filteredData = filteredData.filter(invoice =>
          invoice.invoice_work_orders.some(iwo => {
            const operationalStatus = getOperationalStatus(iwo.work_order);
            return otherFilters.operational_status!.includes(operationalStatus);
          })
        );
      }

      // Filter by report status (through work order reports)
      if (otherFilters.report_status && otherFilters.report_status.length > 0) {
        filteredData = filteredData.filter(invoice =>
          invoice.invoice_work_orders.some(iwo => {
            const reportStatus = iwo.work_order.latest_report?.status || 'not_submitted';
            return otherFilters.report_status!.includes(reportStatus);
          })
        );
      }

      // Filter by partner billing status (complex calculation)
      if (otherFilters.partner_billing_status && otherFilters.partner_billing_status.length > 0) {
        filteredData = filteredData.filter(invoice => {
          const partnerBillingStatus = getPartnerBillingStatus(invoice);
          return otherFilters.partner_billing_status!.includes(partnerBillingStatus);
        });
      }

      return {
        data: filteredData as any[],
        count: filteredData.length,
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

// Helper function to get operational status from work order status
const getOperationalStatus = (workOrder: any): string => {
  switch (workOrder.status) {
    case 'received':
      return 'new';
    case 'assigned':
      return 'assigned';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      // FIX: Access first item in array, not the array itself
      const report = workOrder.latest_report?.[0];
      if (report?.status === 'submitted' || report?.status === 'reviewed') {
        return 'reports_pending';
      }
      return 'complete';
    default:
      return 'new';
  }
};

const getPartnerBillingStatus = (invoice: Invoice): string => {
  const allWorkOrders = invoice.invoice_work_orders || [];
  
  // Check if any work orders are incomplete
  const hasIncompleteWork = allWorkOrders.some(iwo => 
    iwo.work_order?.status !== 'completed'
  );
  if (hasIncompleteWork) return 'report_pending';
  
  // Check if any reports are not approved
  const hasUnapprovedReports = allWorkOrders.some(iwo => {
    const report = iwo.work_order?.latest_report?.[0];
    return !report || report.status !== 'approved';
  });
  if (hasUnapprovedReports) return 'invoice_needed';
  
  // Check invoice status
  if (invoice.status === 'submitted' || invoice.status === 'reviewed') {
    return 'invoice_pending';
  }
  
  if (invoice.status === 'approved') {
    return 'ready_to_bill';
  }
  
  return 'invoice_needed';
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
              organization_id,
              store_location,
              organizations(
                id,
                name
              ),
              latest_report:work_order_reports(
                id,
                status,
                submitted_at,
                reviewed_at
              )
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

      return data as any;
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