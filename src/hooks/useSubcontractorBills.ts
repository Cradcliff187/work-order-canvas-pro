import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubcontractorBillFilters {
  search?: string;
  status?: string[];
  subcontractor_organization_ids?: string[];
  overdue?: boolean;
  date_range?: {
    from?: string;
    to?: string;
  };
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
  subcontractor_organization?: {
    id: string;
    name: string;
  };
  workOrderCount?: number;
  attachmentCount?: number;
  // Heavy nested data only available in detail view
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
  subcontractor_bill_work_orders?: Array<{
    id: string;
    work_order_id: string;
    amount: number;
    description?: string;
    work_orders?: {
      id: string;
      work_order_number: string;
      title: string;
      description?: string;
      store_location?: string;
      street_address?: string;
      city?: string;
      state?: string;
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
    status,
    subcontractor_organization_ids,
    overdue,
    date_range,
    page = 1,
    pageSize = 10
  } = filters;

  return useQuery({
    queryKey: [
      'subcontractor-bills',
      page,
      pageSize,
      search || '',
      JSON.stringify(status || []),
      overdue ? 'overdue' : 'all',
      JSON.stringify(subcontractor_organization_ids || []),
      JSON.stringify(date_range || {}),
    ],
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
          payment_reference,
          admin_notes,
          subcontractor_notes,
          payment_terms,
          purchase_order_number,
          subcontractor_organization_id,
          subcontractor_organization:organizations!subcontractor_organization_id (
            id,
            name
          )
        `, { count: 'exact' });

      // Apply server-side filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (subcontractor_organization_ids && subcontractor_organization_ids.length > 0) {
        query = query.in('subcontractor_organization_id', subcontractor_organization_ids);
      }

      if (date_range?.from) {
        query = query.gte('created_at', new Date(date_range.from).toISOString());
      }

      if (date_range?.to) {
        query = query.lte('created_at', new Date(date_range.to).toISOString());
      }

      if (overdue) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0]);
      }

      // Apply database-level search
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`internal_bill_number.ilike.${searchTerm},external_bill_number.ilike.${searchTerm}`);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Add work order details and attachment count for each bill
      const billsWithCounts = await Promise.all(
        (data || []).map(async (bill) => {
          const [workOrderResult, attachmentResult] = await Promise.all([
            supabase
              .from('subcontractor_bill_work_orders')
              .select(`
                id,
                work_order_id,
                amount,
                description,
                work_orders!subcontractor_bill_work_orders_work_order_id_fkey (
                  id,
                  work_order_number,
                  title
                )
              `)
              .eq('subcontractor_bill_id', bill.id),
            supabase
              .from('subcontractor_bill_attachments')
              .select('*', { count: 'exact', head: true })
              .eq('subcontractor_bill_id', bill.id)
          ]);
          
          return {
            ...bill,
            workOrderCount: workOrderResult.data?.length || 0,
            attachmentCount: attachmentResult.count || 0,
            subcontractor_bill_work_orders: workOrderResult.data || []
          };
        })
      );

      return {
        data: billsWithCounts,
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (was 30 seconds)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData, // Replaces keepPreviousData in v5
    retry: 1, // Only retry once, not 3 times
    retryDelay: 1000,
    enabled: true, // Ensure it's enabled
  });
};

export const useSubcontractorBill = (id: string) => {
  return useQuery({
    queryKey: ['subcontractor-bill', id],
    queryFn: async () => {
      console.log('🔍 Fetching subcontractor bill:', id);
      
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
            work_orders!subcontractor_bill_work_orders_work_order_id_fkey (
              id,
              work_order_number,
              title,
              description,
              status,
              date_submitted,
              store_location,
              street_address,
              city,
              state,
              zip_code,
              organization:organizations!organization_id (
                id,
                name
              ),
              trade:trades!trade_id (
                id,
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
        .maybeSingle();

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Subcontractor bill data received:', {
        billId: data?.id,
        workOrdersCount: data?.subcontractor_bill_work_orders?.length || 0,
        workOrdersData: data?.subcontractor_bill_work_orders
      });

      return data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
};