export interface SubcontractorBillFiltersValue {
  search?: string;
  status?: string[];
  payment_status?: string[];
  partner_organization_ids?: string[];
  subcontractor_organization_ids?: string[];
  location_filter?: string[];
  date_range?: {
    from?: string;
    to?: string;
  };
  overdue?: boolean;
  invoice_status?: string[]; // Keep for backward compatibility
  partner_billing_status?: string[]; // Keep for backward compatibility
}