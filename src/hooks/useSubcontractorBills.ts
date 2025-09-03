import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubcontractorBillFilters {
  search?: string;
  status?: string;
  subcontractor_id?: string;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SubcontractorBill {
  id: string;
  internal_bill_number: string;
  external_bill_number?: string;
  status: string;
  total_amount?: number;
  submitted_at?: string;
  approved_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  submitted_by?: string;
  approved_by?: string;
  subcontractor_organization_id?: string;
  approval_notes?: string;
  payment_reference?: string;
  bill_date: string;
  due_date: string;
  admin_notes?: string;
  subcontractor_notes?: string;
  payment_terms?: string;
  purchase_order_number?: string;
  partner_billing_status?: string;
  submitted_by_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  approved_by_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  subcontractor_organization?: {
    id: string;
    name: string;
    contact_email: string;
    organization_type: string;
  };
  subcontractor_bill_work_orders?: Array<{
    id: string;
    work_order_id: string;
    amount: number;
    description?: string;
  }>;
  subcontractor_bill_attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size?: number;
    uploaded_by: string;
    created_at: string;
  }>;
}


export const useSubcontractorBills = (filters: SubcontractorBillFilters = {}) => {
  const {
    search = '',
    status,
    subcontractor_id,
    overdue,
    page = 1,
    pageSize = 10
  } = filters;

  return useQuery({
    queryKey: ['subcontractor-bills', { search, status, subcontractor_id, overdue, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from('subcontractor_bills')
        .select(`
          id,
          internal_bill_number,
          external_bill_number,
          status,
          total_amount,
          bill_date,
          due_date,
          submitted_at,
          approved_at,
          paid_at,
          created_at,
          updated_at,
          submitted_by,
          approved_by,
          subcontractor_organization_id,
          approval_notes,
          payment_reference,
          admin_notes,
          subcontractor_notes,
          payment_terms,
          purchase_order_number,
          partner_billing_status,
          submitted_by_profile:profiles!submitted_by (
            id,
            first_name,
            last_name,
            email
          ),
          approved_by_profile:profiles!approved_by (
            id,
            first_name,
            last_name,
            email
          ),
          subcontractor_organization:organizations!subcontractor_organization_id (
            id,
            name,
            contact_email,
            organization_type
          ),
          subcontractor_bill_work_orders (
            id,
            work_order_id,
            amount,
            description
          ),
          subcontractor_bill_attachments (
            id,
            file_name,
            file_url,
            file_type,
            file_size,
            uploaded_by,
            created_at
          )
        `, { count: 'exact' });

      // Apply server-side filters
      if (status) {
        query = query.eq('status', status);
      }

      if (subcontractor_id) {
        query = query.eq('subcontractor_organization_id', subcontractor_id);
      }

      if (overdue) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0]);
      }

      // Apply database-level search
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`internal_bill_number.ilike.${searchTerm},external_bill_number.ilike.${searchTerm},subcontractor_organization.name.ilike.${searchTerm}`);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useSubcontractorBill = (id: string) => {
  return useQuery({
    queryKey: ['subcontractor-bill', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_bills')
        .select(`
          id,
          internal_bill_number,
          external_bill_number,
          status,
          total_amount,
          bill_date,
          due_date,
          submitted_at,
          approved_at,
          paid_at,
          created_at,
          updated_at,
          submitted_by,
          approved_by,
          subcontractor_organization_id,
          approval_notes,
          payment_reference,
          admin_notes,
          subcontractor_notes,
          payment_terms,
          purchase_order_number,
          partner_billing_status,
          submitted_by_profile:profiles!submitted_by (
            id,
            first_name,
            last_name,
            email
          ),
          approved_by_profile:profiles!approved_by (
            id,
            first_name,
            last_name,
            email
          ),
          subcontractor_organization:organizations!subcontractor_organization_id (
            id,
            name,
            contact_email,
            organization_type
          ),
          subcontractor_bill_work_orders (
            id,
            work_order_id,
            amount,
            description
          ),
          subcontractor_bill_attachments (
            id,
            file_name,
            file_url,
            file_type,
            file_size,
            uploaded_by,
            created_at,
            uploaded_by_profile:profiles!uploaded_by (
              first_name,
              last_name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
};