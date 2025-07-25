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
  created_user: { 
    first_name: string; 
    last_name: string;
    email: string;
  } | null;
  work_order_reports: Array<{
    id: string;
    status: string;
    submitted_at: string;
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
  work_order_assignments?: Array<{
    id: string;
    assigned_to: string;
    assigned_organization_id: string | null;
    assignment_type: string;
    notes: string | null;
    assigned_at: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
      user_type: string;
    } | null;
    assigned_organization: {
      name: string;
      organization_type: string;
    } | null;
  }>;
  location_contact_name?: string | null;
  location_contact_phone?: string | null;
  location_contact_email?: string | null;
};

export type { WorkOrderDetail };

export function useWorkOrderDetail(id: string) {
  return useQuery({
    queryKey: ['work-order-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Work order ID is required');

      // First, get the work order data
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
          created_user:profiles!created_by(
            first_name,
            last_name,
            email
          ),
          work_order_reports(
            id,
            status,
            submitted_at,
            work_performed,
            hours_worked,
            subcontractor_user:profiles!subcontractor_user_id(
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
          ),
          work_order_assignments(
            id,
            assigned_to,
            assigned_organization_id,
            assignment_type,
            notes,
            assigned_at,
            profiles!work_order_assignments_assigned_to_fkey(
              first_name,
              last_name,
              email,
              user_type
            ),
            assigned_organization:organizations!assigned_organization_id(
              name,
              organization_type
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Then get location contact information if available
      let locationContact = null;
      if (data.partner_location_number && data.organization_id) {
        const { data: locationData } = await supabase
          .from("partner_locations")
          .select("contact_name, contact_phone, contact_email")
          .eq("organization_id", data.organization_id)
          .eq("location_number", data.partner_location_number)
          .maybeSingle();
        
        locationContact = locationData;
      }

      return {
        ...data,
        location_contact_name: locationContact?.contact_name,
        location_contact_phone: locationContact?.contact_phone,
        location_contact_email: locationContact?.contact_email,
      };
    },
    enabled: !!id,
  });
}