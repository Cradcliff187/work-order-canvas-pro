export interface SubcontractorBillFiltersValue {
  search?: string;
  status?: string[];
  subcontractor_organization_ids?: string[];
  date_range?: {
    from?: string;
    to?: string;
  };
  overdue?: boolean;
}