import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type WorkOrderDetail = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { 
    name: string; 
    contact_email: string; 
    contact_phone: string | null;
    address: string | null;
  } | null;
  trades: { 
    name: string; 
    description: string | null;
  } | null;
  assigned_user: { 
    first_name: string; 
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  created_user: { 
    first_name: string; 
    last_name: string;
    email: string;
  } | null;
  work_order_reports: Array<{
    id: string;
    status: string;
    submitted_at: string;
    invoice_amount: number;
    work_performed: string;
    hours_worked: number | null;
    subcontractor_user: {
      first_name: string;
      last_name: string;
    };
  }>;
  work_order_attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    uploaded_at: string;
    uploaded_by_user: {
      first_name: string;
      last_name: string;
    };
  }>;
};

export function useWorkOrderDetail(id: string) {
  return useQuery({
    queryKey: ['work-order-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Work order ID is required');

      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(
            name,
            contact_email,
            contact_phone,
            address
          ),
          trades!trade_id(
            name,
            description
          ),
          assigned_user:user_profiles_with_organization!assigned_to(
            first_name,
            last_name,
            email,
            phone
          ),
          created_user:profiles!created_by(
            first_name,
            last_name,
            email
          ),
          work_order_reports(
            id,
            status,
            submitted_at,
            invoice_amount,
            work_performed,
            hours_worked,
            subcontractor_user:user_profiles_with_organization!subcontractor_user_id(
              first_name,
              last_name
            )
          ),
          work_order_attachments(
            id,
            file_name,
            file_url,
            file_type,
            uploaded_at,
            uploaded_by_user:profiles!uploaded_by_user_id(
              first_name,
              last_name
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as WorkOrderDetail | null;
    },
    enabled: !!id,
  });
}