import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceFilters {
  status?: string[];
  paymentStatus?: 'paid' | 'unpaid';
  search?: string;
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
  return useQuery({
    queryKey: ['invoices', filters],
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
          invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_order:work_orders(
              id,
              work_order_number,
              title
            )
          ),
          attachment_count:invoice_attachments(count)
        `)
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

      // Apply search filter (search both internal and external invoice numbers)
      if (otherFilters.search) {
        query = query.or(
          `internal_invoice_number.ilike.%${otherFilters.search}%,external_invoice_number.ilike.%${otherFilters.search}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      // Transform attachment count from array to number
      const transformedData = data?.map(invoice => ({
        ...invoice,
        attachment_count: Array.isArray(invoice.attachment_count) 
          ? (invoice.attachment_count[0]?.count || 0)
          : (invoice.attachment_count || 0)
      })) || [];

      return {
        data: transformedData as Invoice[],
        count: count || 0,
      };
    },
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
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
    enabled: !!id,
  });
};