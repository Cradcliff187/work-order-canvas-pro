
import { Database } from '@/integrations/supabase/types';

export type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'] & {
  work_orders: {
    work_order_number: string | null;
    title: string;
    organizations: { name: string } | null;
    trades: { name: string } | null;
    store_location: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    description: string | null;
    partner_location_number: string | null;
  } | null;
  subcontractor: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    organization_members: Array<{
      role: string;
      organizations: {
        id: string;
        name: string;
        organization_type: string;
      } | null;
    }>;
  } | null;
  subcontractor_organization: {
    id: string;
    name: string;
    initials: string;
  } | null;
  reviewed_by: {
    first_name: string;
    last_name: string;
  } | null;
  submitted_by?: {
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
};

export interface ReportFilters {
  status?: string[];
  subcontractor_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  location_filter?: string;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}
