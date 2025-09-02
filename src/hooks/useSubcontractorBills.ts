import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubcontractorBillFilters {
  search?: string;
  status?: string;
  subcontractor_organization_id?: string;
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
      organizations?: {
        name: string;
      };
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

// Helper functions for status derivation
const getOperationalStatus = (bill: SubcontractorBill) => {
  if (bill.status === 'paid') return 'paid';
  if (bill.status === 'approved') return 'approved';
  if (bill.status === 'rejected') return 'rejected';
  if (bill.status === 'submitted') return 'pending_approval';
  if (bill.status === 'draft') return 'draft';
  return 'unknown';
};

const getPartnerInvoicingStatus = (bill: SubcontractorBill) => {
  const workOrders = bill.subcontractor_bill_work_orders || [];
  if (workOrders.length === 0) return 'not_applicable';
  
  const allBilled = workOrders.every(wo => 
    wo.work_orders?.organizations?.name // This would need to be enhanced with actual billing status
  );
  
  return allBilled ? 'billed' : 'pending';
};

export const useSubcontractorBills = (filters: SubcontractorBillFilters = {}) => {
  const {
    search = '',
    status = '',
    subcontractor_organization_id,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 10
  } = filters;

  return useQuery({
    queryKey: ['subcontractor-bills', { search, status, subcontractor_organization_id, dateFrom, dateTo, page, pageSize }],
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
            created_at
          )
        `, { count: 'exact' });

      // Apply server-side filters
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (subcontractor_organization_id) {
        query = query.eq('subcontractor_organization_id', subcontractor_organization_id);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Apply client-side search filter (for complex searches across related data)
      let filteredData = data || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(bill => {
          return (
            bill.internal_bill_number?.toLowerCase().includes(searchLower) ||
            bill.external_bill_number?.toLowerCase().includes(searchLower) ||
            bill.subcontractor_organization?.name?.toLowerCase().includes(searchLower) ||
            bill.submitted_by_profile?.first_name?.toLowerCase().includes(searchLower) ||
            bill.submitted_by_profile?.last_name?.toLowerCase().includes(searchLower) ||
            bill.subcontractor_bill_work_orders?.some(wo => 
              wo.work_orders?.work_order_number?.toLowerCase().includes(searchLower) ||
              wo.work_orders?.title?.toLowerCase().includes(searchLower) ||
              wo.work_orders?.organizations?.name?.toLowerCase().includes(searchLower)
            )
          );
        });
      }

      // Add derived status fields
      const enrichedData = filteredData.map(bill => ({
        ...bill,
        operational_status: getOperationalStatus(bill),
        partner_billing_status: getPartnerInvoicingStatus(bill)
      }));

      return {
        data: enrichedData,
        count: search ? filteredData.length : count,
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

      // Add derived status fields
      return {
        ...data,
        operational_status: getOperationalStatus(data),
        partner_billing_status: getPartnerInvoicingStatus(data)
      };
    },
    enabled: !!id,
    staleTime: 30000,
  });
};