import { useMemo } from 'react';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Button } from '@/components/ui/button';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { AlertTriangle } from 'lucide-react';

// Filter interface aligned with work order pipeline workflow
export interface InvoiceFiltersValue {
  search?: string;
  overdue?: boolean;
  partner_organization_id?: string;
  location_filter?: string[];
  subcontractor_organization_id?: string;
  operational_status?: string[];
  report_status?: string[];
  invoice_status?: string[];
  partner_billing_status?: string[];
}

interface InvoiceFiltersProps {
  value: InvoiceFiltersValue;
  onChange: (value: InvoiceFiltersValue) => void;
  onClear: () => void;
  filterCount: number;
}

// Status options matching WorkOrderPipelineTable exactly
const operationalStatusOptions = [
  { value: 'new', label: 'New Orders' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'reports_pending', label: 'Reports Pending Review' },
  { value: 'complete', label: 'Completed' }
];

const reportStatusOptions = [
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Needs Revision' }
];

const invoiceStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const partnerBillingStatusOptions = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'invoice_needed', label: 'Subcontractor Bill Needed' },
  { value: 'invoice_pending', label: 'Bill Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Invoice Partner' },
  { value: 'billed', label: 'Partner Invoiced' },
];

export function InvoiceFilters({ value, onChange, onClear, filterCount }: InvoiceFiltersProps) {
  // Get partner locations for the selected partner organization
  const { data: partnerLocations } = usePartnerLocations(value.partner_organization_id);

  // Create location options from partner locations
  const locationOptions = useMemo(() => {
    if (!partnerLocations) return [];
    
    return partnerLocations.map(location => ({
      value: location.location_name,
      label: `${location.location_name} (${location.location_number})`
    }));
  }, [partnerLocations]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.overdue) count++;
    if (value.partner_organization_id) count++;
    if (value.location_filter?.length) count += value.location_filter.length;
    if (value.subcontractor_organization_id) count++;
    if (value.operational_status?.length) count += value.operational_status.length;
    if (value.report_status?.length) count += value.report_status.length;
    if (value.invoice_status?.length) count += value.invoice_status.length;
    if (value.partner_billing_status?.length) count += value.partner_billing_status.length;
    return count;
  }, [value]);

  // Helper function to update filter values
  const set = (key: keyof InvoiceFiltersValue, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };

  // Search slot for AdminFilterBar
  const searchSlot = (
    <SmartSearchInput
      value={value.search || ''}
      onChange={(e) => set('search', e.target.value)}
      placeholder="Search bills..."
      storageKey="admin-invoices-search"
      className="w-full"
    />
  );

  const renderOverdueFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Quick Filter</label>
      <Button
        variant={value.overdue ? "default" : "outline"}
        size="sm"
        onClick={() => set('overdue', !value.overdue)}
        className="w-full justify-start"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Overdue Only
      </Button>
    </div>
  );

  const renderInvoiceStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Invoice Status</label>
      <MultiSelectFilter
        options={invoiceStatusOptions}
        selectedValues={value.invoice_status || []}
        onSelectionChange={(statuses) => set('invoice_status', statuses)}
        placeholder="Invoice Status"
        maxDisplayCount={2}
      />
    </div>
  );

  const renderPartnerOrganizationFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Partner Organization</label>
      <OrganizationSelector
        value={value.partner_organization_id || ''}
        onChange={(partnerId) => {
          set('partner_organization_id', partnerId);
          // Clear location filter when partner changes
          if (value.location_filter?.length) {
            set('location_filter', []);
          }
        }}
        organizationType="partner"
        placeholder="Select Partner"
      />
    </div>
  );

  const renderLocationFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Locations</label>
      <MultiSelectFilter
        options={locationOptions}
        selectedValues={value.location_filter || []}
        onSelectionChange={(locations) => set('location_filter', locations)}
        placeholder="Select Locations"
        disabled={!value.partner_organization_id}
        maxDisplayCount={2}
      />
    </div>
  );

  const renderSubcontractorFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Subcontractor</label>
      <OrganizationSelector
        value={value.subcontractor_organization_id || ''}
        onChange={(subcontractorId) => set('subcontractor_organization_id', subcontractorId)}
        organizationType="subcontractor"
        placeholder="Select Subcontractor"
      />
    </div>
  );

  const renderOperationalStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Work Status</label>
      <MultiSelectFilter
        options={operationalStatusOptions}
        selectedValues={value.operational_status || []}
        onSelectionChange={(statuses) => set('operational_status', statuses)}
        placeholder="Work Status"
        maxDisplayCount={2}
      />
    </div>
  );

  const renderReportStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Report Status</label>
      <MultiSelectFilter
        options={reportStatusOptions}
        selectedValues={value.report_status || []}
        onSelectionChange={(statuses) => set('report_status', statuses)}
        placeholder="Report Status"
        maxDisplayCount={2}
      />
    </div>
  );

  const renderPartnerInvoicingStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Partner Invoicing Status</label>
      <MultiSelectFilter
        options={partnerBillingStatusOptions}
        selectedValues={value.partner_billing_status || []}
        onSelectionChange={(statuses) => set('partner_billing_status', statuses)}
        placeholder="Partner Invoicing Status"
        maxDisplayCount={2}
      />
    </div>
  );

  // Essential filters (always visible)
  const essentialFilters = (
    <div className="space-y-4">
      {renderOverdueFilter()}
      {renderInvoiceStatusFilter()}
    </div>
  );

  // Advanced filters (grouped)
  const advancedFilters = (
    <div className="space-y-4">
      {renderPartnerOrganizationFilter()}
      {value.partner_organization_id && renderLocationFilter()}
      {renderSubcontractorFilter()}
      {renderOperationalStatusFilter()}
      {renderReportStatusFilter()}
      {renderPartnerInvoicingStatusFilter()}
    </div>
  );

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={activeFilterCount}
      onClear={onClear}
      searchSlot={searchSlot}
      sheetSide="bottom"
      sections={{
        essential: essentialFilters,
        advanced: advancedFilters
      }}
    />
  );
}