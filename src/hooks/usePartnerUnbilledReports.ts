import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerUnbilledReport {
  id: string;
  work_order_id: string;
  work_performed: string;
  materials_used: string | null;
  hours_worked: number | null;
  notes: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  partner_billed_at: string | null;
  partner_billed_amount: number | null;
  partner_invoice_id: string | null;
  subcontractor_organization_id: string | null;
  submitted_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  approved_subcontractor_invoice_amount: number | null;
  work_orders: {
    work_order_number: string | null;
    title: string;
    description: string | null;
    store_location: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    internal_estimate_amount: number | null;
    internal_estimate_description: string | null;
  } | null;
  subcontractor_organization: {
    id: string;
    name: string;
    initials: string;
  } | null;
  subcontractor: {
    first_name: string;
    last_name: string;
    email: string;
    organization_members: Array<{
      role: string;
      organizations: {
        id: string;
        name: string;
        organization_type: string;
      } | null;
    }>;
  } | null;
  submitted_by: {
    first_name: string;
    last_name: string;
    email: string;
    organization_members: Array<{
      role: string;
      organizations: {
        id: string;
        name: string;
        organization_type: string;
      } | null;
    }>;
  } | null;
}

export const usePartnerUnbilledReports = (partnerOrgId?: string) => {
  return useQuery({
    queryKey: ['partner-unbilled-reports', partnerOrgId],
    queryFn: async (): Promise<PartnerUnbilledReport[]> => {
      if (!partnerOrgId) return [];
      
      const { data, error } = await supabase
        .rpc('get_partner_unbilled_reports_with_approved_invoices', {
          partner_org_id: partnerOrgId
        });

      if (error) throw error;

      // Transform the function results to match our interface
      return (data || []).map((row: any) => ({
        id: row.id,
        work_order_id: row.work_order_id,
        work_performed: row.work_performed,
        materials_used: row.materials_used,
        hours_worked: row.hours_worked,
        notes: row.notes,
        status: row.status,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        partner_billed_at: row.partner_billed_at,
        partner_billed_amount: row.partner_billed_amount,
        partner_invoice_id: row.partner_invoice_id,
        subcontractor_organization_id: row.subcontractor_organization_id,
        submitted_by_user_id: row.submitted_by_user_id,
        reviewed_by_user_id: row.reviewed_by_user_id,
        approved_subcontractor_invoice_amount: row.subcontractor_costs,
        work_orders: {
          work_order_number: row.work_order_number,
          title: row.title,
          description: row.description,
          store_location: row.store_location,
          street_address: row.street_address,
          city: row.city,
          state: row.state,
          zip_code: row.zip_code,
          internal_estimate_amount: row.internal_estimate_amount || null,
          internal_estimate_description: row.internal_estimate_description || null,
        },
        subcontractor_organization: row.org_id ? {
          id: row.org_id,
          name: row.org_name,
          initials: row.org_initials,
        } : null,
        subcontractor: row.subcontractor_first_name ? {
          first_name: row.subcontractor_first_name,
          last_name: row.subcontractor_last_name,
          email: row.subcontractor_email,
          organization_members: []
        } : null,
        submitted_by: row.submitted_by_first_name ? {
          first_name: row.submitted_by_first_name,
          last_name: row.submitted_by_last_name,
          email: row.submitted_by_email,
          organization_members: []
        } : null,
      }));
    },
    staleTime: 60000,
    enabled: !!partnerOrgId,
  });
};