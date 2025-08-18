import { useMemo } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Button } from '@/components/ui/button';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
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
  { value: 'invoice_needed', label: 'Subcontractor Invoice Needed' },
  { value: 'invoice_pending', label: 'Invoice Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Bill Partner' },
  { value: 'billed', label: 'Partner Billed' },
];

export function InvoiceFilters({ value, onChange, onClear }: InvoiceFiltersProps) {
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

  // Helper function to update filter values
  const set = (key: keyof InvoiceFiltersValue, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };

  // Calculate active filter count for clear button
  const filterCount = Object.values(value).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim() !== '';
    if (typeof v === 'boolean') return v;
    return false;
  }).length;

  return (
    <AdminFilterBar
      title="Invoice Filters"
      filterCount={filterCount}
      onClear={onClear}
      collapsible
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Smart Search Input */}
        <div className="col-span-full sm:col-span-2">
          <SmartSearchInput
            value={value.search || ''}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search invoices..."
            storageKey="admin-invoices-search"
          />
        </div>

        {/* Overdue Quick Filter */}
        <div className="flex items-center">
          <Button
            variant={value.overdue ? "default" : "outline"}
            size="sm"
            onClick={() => set('overdue', !value.overdue)}
            className="w-full"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Overdue Only
          </Button>
        </div>

        {/* Partner Organization Selector */}
        <div>
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

        {/* Location Filter (dependent on partner selection) */}
        <div>
          <MultiSelectFilter
            options={locationOptions}
            selectedValues={value.location_filter || []}
            onSelectionChange={(locations) => set('location_filter', locations)}
            placeholder="Select Locations"
            disabled={!value.partner_organization_id}
            maxDisplayCount={2}
          />
        </div>

        {/* Subcontractor Organization Selector */}
        <div>
          <OrganizationSelector
            value={value.subcontractor_organization_id || ''}
            onChange={(subcontractorId) => set('subcontractor_organization_id', subcontractorId)}
            organizationType="subcontractor"
            placeholder="Select Subcontractor"
          />
        </div>

        {/* Operational Status Multi-Select */}
        <div>
          <MultiSelectFilter
            options={operationalStatusOptions}
            selectedValues={value.operational_status || []}
            onSelectionChange={(statuses) => set('operational_status', statuses)}
            placeholder="Work Status"
            maxDisplayCount={2}
          />
        </div>

        {/* Report Status Multi-Select */}
        <div>
          <MultiSelectFilter
            options={reportStatusOptions}
            selectedValues={value.report_status || []}
            onSelectionChange={(statuses) => set('report_status', statuses)}
            placeholder="Report Status"
            maxDisplayCount={2}
          />
        </div>

        {/* Invoice Status Multi-Select */}
        <div>
          <MultiSelectFilter
            options={invoiceStatusOptions}
            selectedValues={value.invoice_status || []}
            onSelectionChange={(statuses) => set('invoice_status', statuses)}
            placeholder="Invoice Status"
            maxDisplayCount={2}
          />
        </div>

        {/* Partner Billing Status Multi-Select */}
        <div>
          <MultiSelectFilter
            options={partnerBillingStatusOptions}
            selectedValues={value.partner_billing_status || []}
            onSelectionChange={(statuses) => set('partner_billing_status', statuses)}
            placeholder="Partner Billing Status"
            maxDisplayCount={2}
          />
        </div>
      </div>
    </AdminFilterBar>
  );
}