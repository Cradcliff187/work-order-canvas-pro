import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubcontractorBillFilters {
  search?: string;
  status?: string;
  subcontractor_organization_ids?: string[];
  partner_organization_ids?: string[];
  location_filter?: string[];
  invoice_status?: string[];
  partner_billing_status?: string[];
  overdue?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
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
    work_orders?: {
      id: string;
      work_order_number: string;
      title: string;
      organization_id: string;
      date_completed?: string;
      store_location?: string;
      city?: string;
      state?: string;
      organizations?: {
        name: string;
      };
      work_order_assignments?: Array<{
        assigned_organization_id: string;
        assigned_organization?: {
          id: string;
          name: string;
        };
      }>;
    };
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
    status = '',
    subcontractor_organization_ids,
    partner_organization_ids,
    location_filter,
    invoice_status,
    partner_billing_status,
    overdue,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 10
  } = filters;

  return useQuery({
    queryKey: ['subcontractor-bills', { search, status, subcontractor_organization_ids, partner_organization_ids, location_filter, invoice_status, partner_billing_status, overdue, dateFrom, dateTo, page, pageSize }],
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
            description,
            work_orders (
              id,
              work_order_number,
              title,
              organization_id,
              date_completed,
              store_location,
              city,
              state,
              organizations!organization_id (
                name
              ),
              work_order_assignments (
                assigned_organization_id,
                assigned_organization:organizations!assigned_organization_id (
                  id,
                  name
                )
              )
            )
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
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (subcontractor_organization_ids && subcontractor_organization_ids.length > 0) {
        // Filter by work performers (assigned organizations) through work orders
        query = query.in('subcontractor_bill_work_orders.work_orders.work_order_assignments.assigned_organization_id', subcontractor_organization_ids);
      }

      if (partner_organization_ids && partner_organization_ids.length > 0) {
        // Filter by partner organizations where work was performed
        query = query.in('subcontractor_bill_work_orders.work_orders.organization_id', partner_organization_ids);
      }

      if (location_filter && location_filter.length > 0) {
        // Filter by work order locations
        const locationQueries = location_filter.map(location => 
          `subcontractor_bill_work_orders.work_orders.store_location.ilike.%${location}%,subcontractor_bill_work_orders.work_orders.city.ilike.%${location}%`
        ).join(',');
        query = query.or(locationQueries);
      }

      if (dateFrom) {
        // Filter by work completion dates instead of bill creation dates
        query = query.gte('subcontractor_bill_work_orders.work_orders.date_completed', dateFrom.toISOString());
      }

      if (dateTo) {
        // Filter by work completion dates instead of bill creation dates  
        query = query.lte('subcontractor_bill_work_orders.work_orders.date_completed', dateTo.toISOString());
      }

      if (overdue) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0]);
      }

      if (partner_billing_status && partner_billing_status.length > 0) {
        query = query.in('partner_billing_status', partner_billing_status);
      }

      // Apply database-level search - include work order numbers
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`internal_bill_number.ilike.${searchTerm},external_bill_number.ilike.${searchTerm},subcontractor_organization.name.ilike.${searchTerm},subcontractor_bill_work_orders.work_orders.work_order_number.ilike.${searchTerm}`);
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
            description,
            work_orders (
              id,
              work_order_number,
              title,
              description,
              organization_id,
              status,
              created_at,
              organizations!organization_id (
                name
              )
            )
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