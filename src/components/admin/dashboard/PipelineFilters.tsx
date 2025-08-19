import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { useTrades } from '@/hooks/useWorkOrders';
import { useOrganizations } from '@/hooks/useOrganizations';

interface PipelineFiltersValue {
  search?: string;
  operational_status?: string[];
  financial_status?: string[];
  partner_billing_status?: string[];
  partner_organization_id?: string;
  overdue?: boolean;
  priority?: string[];
  trade_id?: string[];
  assigned_organization_id?: string[];
  report_status?: string[];
  location_filter?: string[];
  date_from?: string;
  date_to?: string;
  age_range?: [number, number];
}

interface PipelineFiltersProps {
  value: PipelineFiltersValue;
  onChange: (value: PipelineFiltersValue) => void;
  onClear: () => void;
  filterCount: number;
  locationOptions?: Array<{ value: string; label: string }>;
}

// Filter options
const operationalStatusOptions = [
  { value: 'new', label: 'New Orders' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'reports_pending', label: 'Reports Pending Review' },
  { value: 'complete', label: 'Completed' }
];

const financialStatusOptions = [
  { value: 'not_billed', label: 'No Invoice' },
  { value: 'invoice_received', label: 'Invoice Received' },
  { value: 'paid', label: 'Paid' }
];

const partnerBillingStatusOptions = [
  { value: 'report_pending', label: 'Report Pending' },
  { value: 'invoice_needed', label: 'Subcontractor Invoice Needed' },
  { value: 'invoice_pending', label: 'Invoice Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Bill Partner' },
  { value: 'billed', label: 'Partner Billed' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const reportStatusOptions = [
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Needs Revision' }
];

export function PipelineFilters({ 
  value, 
  onChange, 
  onClear, 
  filterCount,
  locationOptions = []
}: PipelineFiltersProps) {
  const { data: trades } = useTrades();
  const { data: organizations } = useOrganizations();

  const tradeOptions = trades?.map(trade => ({
    value: trade.id,
    label: trade.name
  })) || [];

  const assignedOrgOptions = organizations?.filter(org => org.organization_type === 'subcontractor')
    .map(org => ({
      value: org.id,
      label: org.name
    })) || [];

  return (
    <div className="space-y-6 p-4">
      {/* Clear All Button */}
      {filterCount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{filterCount} active filters</span>
          <Button variant="ghost" onClick={onClear} size="sm">
            Clear All
          </Button>
        </div>
      )}

      {/* Operational Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Work Status</Label>
        <MultiSelectFilter
          options={operationalStatusOptions}
          selectedValues={value.operational_status || []}
          onSelectionChange={(newValue) => onChange({ ...value, operational_status: newValue })}
          placeholder="Select work status..."
          searchPlaceholder="Search status..."
        />
      </div>

      {/* Report Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Report Status</Label>
        <MultiSelectFilter
          options={reportStatusOptions}
          selectedValues={value.report_status || []}
          onSelectionChange={(newValue) => onChange({ ...value, report_status: newValue })}
          placeholder="Select report status..."
          searchPlaceholder="Search status..."
        />
      </div>

      {/* Partner Billing Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Partner Billing Status</Label>
        <MultiSelectFilter
          options={partnerBillingStatusOptions}
          selectedValues={value.partner_billing_status || []}
          onSelectionChange={(newValue) => onChange({ ...value, partner_billing_status: newValue })}
          placeholder="Select billing status..."
          searchPlaceholder="Search status..."
        />
      </div>

      {/* Financial Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Invoice Status</Label>
        <MultiSelectFilter
          options={financialStatusOptions}
          selectedValues={value.financial_status || []}
          onSelectionChange={(newValue) => onChange({ ...value, financial_status: newValue })}
          placeholder="Select invoice status..."
          searchPlaceholder="Search status..."
        />
      </div>

      {/* Partner Organization */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Partner Organization</Label>
        <OrganizationSelector
          value={value.partner_organization_id || ''}
          onChange={(newValue) => onChange({ ...value, partner_organization_id: newValue })}
          placeholder="Select partner..."
          organizationType="partner"
        />
      </div>

      {/* Trade */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Trade</Label>
        <MultiSelectFilter
          options={tradeOptions}
          selectedValues={value.trade_id || []}
          onSelectionChange={(newValue) => onChange({ ...value, trade_id: newValue })}
          placeholder="Select trades..."
          searchPlaceholder="Search trades..."
        />
      </div>

      {/* Assigned Organization */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Assigned To</Label>
        <MultiSelectFilter
          options={assignedOrgOptions}
          selectedValues={value.assigned_organization_id || []}
          onSelectionChange={(newValue) => onChange({ ...value, assigned_organization_id: newValue })}
          placeholder="Select organizations..."
          searchPlaceholder="Search organizations..."
        />
      </div>

      {/* Location */}
      {locationOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Location</Label>
          <MultiSelectFilter
            options={locationOptions}
            selectedValues={value.location_filter || []}
            onSelectionChange={(newValue) => onChange({ ...value, location_filter: newValue })}
            placeholder="Select locations..."
            searchPlaceholder="Search locations..."
          />
        </div>
      )}

      {/* Priority */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Priority</Label>
        <MultiSelectFilter
          options={priorityOptions}
          selectedValues={value.priority || []}
          onSelectionChange={(newValue) => onChange({ ...value, priority: newValue })}
          placeholder="Select priority..."
          searchPlaceholder="Search priority..."
        />
      </div>

      {/* Overdue Filter */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Show Overdue Only</Label>
        <Switch
          checked={value.overdue || false}
          onCheckedChange={(checked) => onChange({ ...value, overdue: checked })}
        />
      </div>
    </div>
  );
}