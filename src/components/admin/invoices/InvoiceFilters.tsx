import { useState, useMemo } from 'react';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Filter, ChevronDown, X } from 'lucide-react';

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
  { value: 'invoice_needed', label: 'Subcontractor Invoice Needed' },
  { value: 'invoice_pending', label: 'Invoice Pending Approval' },
  { value: 'ready_to_bill', label: 'Ready to Bill Partner' },
  { value: 'billed', label: 'Partner Billed' },
];

export function InvoiceFilters({ value, onChange, onClear, filterCount }: InvoiceFiltersProps) {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDesktopSheetOpen, setIsDesktopSheetOpen] = useState(false);

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

  // Filter render functions
  const renderSearchFilter = () => (
    <SmartSearchInput
      value={value.search || ''}
      onChange={(e) => set('search', e.target.value)}
      placeholder="Search invoices..."
      storageKey="admin-invoices-search"
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

  const renderPartnerBillingStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Partner Billing Status</label>
      <MultiSelectFilter
        options={partnerBillingStatusOptions}
        selectedValues={value.partner_billing_status || []}
        onSelectionChange={(statuses) => set('partner_billing_status', statuses)}
        placeholder="Partner Billing Status"
        maxDisplayCount={2}
      />
    </div>
  );

  // Mobile implementation
  if (isMobile) {
    return (
      <div className="block lg:hidden">
        <div className="space-y-4">
          {/* Always visible search */}
          <div className="bg-card rounded-lg p-4 border shadow-sm">
            {renderSearchFilter()}
          </div>

          {/* Filter trigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[85vh] flex flex-col">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Filter Invoices</SheetTitle>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClear();
                        setIsSheetOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto space-y-6 py-4">
                {/* Essential Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Essential Filters</h3>
                  {renderOverdueFilter()}
                  {renderInvoiceStatusFilter()}
                </div>

                {/* Advanced Filters Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Advanced Filters</h3>
                  {renderPartnerOrganizationFilter()}
                  {value.partner_organization_id && renderLocationFilter()}
                  {renderSubcontractorFilter()}
                  {renderOperationalStatusFilter()}
                  {renderReportStatusFilter()}
                  {renderPartnerBillingStatusFilter()}
                </div>
              </div>

              <SheetFooter className="border-t pt-4">
                <Button 
                  onClick={() => setIsSheetOpen(false)}
                  className="w-full"
                >
                  Apply Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  // Desktop implementation
  return (
    <div className="hidden lg:block">
      <div className="space-y-4">
        {/* Always visible search */}
        <div className="bg-card rounded-lg p-4 border shadow-sm">
          {renderSearchFilter()}
        </div>

        {/* Filter trigger */}
        <Sheet open={isDesktopSheetOpen} onOpenChange={setIsDesktopSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          
          <SheetContent side="right" className="w-[420px] flex flex-col">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Filter Invoices</SheetTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClear();
                      setIsDesktopSheetOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Essential Filters Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Essential Filters</h3>
                {renderOverdueFilter()}
                {renderInvoiceStatusFilter()}
              </div>

              {/* Advanced Filters Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b pb-2">Advanced Filters</h3>
                {renderPartnerOrganizationFilter()}
                {value.partner_organization_id && renderLocationFilter()}
                {renderSubcontractorFilter()}
                {renderOperationalStatusFilter()}
                {renderReportStatusFilter()}
                {renderPartnerBillingStatusFilter()}
              </div>
            </div>

            <SheetFooter className="border-t pt-4">
              <Button 
                onClick={() => setIsDesktopSheetOpen(false)}
                className="w-full"
              >
                Apply Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}