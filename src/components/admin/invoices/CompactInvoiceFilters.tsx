import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Filter, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import type { InvoiceFiltersValue } from './InvoiceFilters';

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
  { value: 'billed', label: 'Partner Billed' }
];

export function CompactInvoiceFilters({
  value,
  onChange,
  onClear
}: {
  value: InvoiceFiltersValue;
  onChange: (value: InvoiceFiltersValue) => void;
  onClear: () => void;
}) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  
  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Get partner locations for the selected partner organization
  const { data: partnerLocations } = usePartnerLocations(localValue.partner_organization_id);
  
  // Create location options from partner locations
  const locationOptions = useMemo(() => {
    if (!partnerLocations) return [];
    
    return partnerLocations.map(location => ({
      value: location.location_name,
      label: `${location.location_name} (${location.location_number})`
    }));
  }, [partnerLocations]);
  
  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (localValue.overdue) count++;
    if (localValue.partner_organization_id) count++;
    if (localValue.location_filter?.length) count += localValue.location_filter.length;
    if (localValue.subcontractor_organization_id) count++;
    if (localValue.operational_status?.length) count += localValue.operational_status.length;
    if (localValue.report_status?.length) count += localValue.report_status.length;
    if (localValue.invoice_status?.length) count += localValue.invoice_status.length;
    if (localValue.partner_billing_status?.length) count += localValue.partner_billing_status.length;
    return count;
  }, [localValue]);

  // Handle filter changes
  const handleFilterChange = (key: keyof InvoiceFiltersValue, filterValue: any) => {
    setLocalValue(prev => ({ ...prev, [key]: filterValue }));
  };

  const handleApplyFilters = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    onClear();
    setLocalValue({});
    setIsOpen(false);
  };

  // Filter content component
  const FilterContent = () => {
    return (
      <>
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* Overdue Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Filters</label>
            <Button
              variant={localValue.overdue ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('overdue', !localValue.overdue)}
              className="w-full justify-start"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Overdue Only
            </Button>
          </div>

          {/* Invoice Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Invoice Status</label>
            <MultiSelectFilter
              options={invoiceStatusOptions}
              selectedValues={localValue.invoice_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('invoice_status', filterValue)}
              placeholder="Filter by invoice status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <OrganizationSelector
              value={localValue.partner_organization_id || ''}
              onChange={(partnerId) => {
                handleFilterChange('partner_organization_id', partnerId);
                // Clear location filter when partner changes
                if (localValue.location_filter?.length) {
                  handleFilterChange('location_filter', []);
                }
              }}
              organizationType="partner"
              placeholder="Select Partner"
            />
          </div>

          {/* Locations Filter */}
          {localValue.partner_organization_id && (
            <div>
              <label className="text-sm font-medium mb-2 block">Locations</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={localValue.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder="Select locations..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Subcontractor Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subcontractor</label>
            <OrganizationSelector
              value={localValue.subcontractor_organization_id || ''}
              onChange={(subcontractorId) => handleFilterChange('subcontractor_organization_id', subcontractorId)}
              organizationType="subcontractor"
              placeholder="Select Subcontractor"
            />
          </div>

          {/* Operational Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Work Status</label>
            <MultiSelectFilter
              options={operationalStatusOptions}
              selectedValues={localValue.operational_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('operational_status', filterValue)}
              placeholder="Filter by work status..."
              className="w-full h-10"
            />
          </div>

          {/* Report Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Report Status</label>
            <MultiSelectFilter
              options={reportStatusOptions}
              selectedValues={localValue.report_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('report_status', filterValue)}
              placeholder="Filter by report status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Billing Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Billing Status</label>
            <MultiSelectFilter
              options={partnerBillingStatusOptions}
              selectedValues={localValue.partner_billing_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('partner_billing_status', filterValue)}
              placeholder="Filter by billing status..."
              className="w-full h-10"
            />
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear
          </Button>
          <Button onClick={handleApplyFilters}>
            Apply
          </Button>
        </div>
      </>
    );
  };

  // Mobile full-screen overlay component
  const MobileFilterOverlay = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
          >
            ✕
          </Button>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Overdue Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Filters</label>
            <Button
              variant={localValue.overdue ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('overdue', !localValue.overdue)}
              className="w-full justify-start"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Overdue Only
            </Button>
          </div>

          {/* Invoice Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Invoice Status</label>
            <MultiSelectFilter
              options={invoiceStatusOptions}
              selectedValues={localValue.invoice_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('invoice_status', filterValue)}
              placeholder="Filter by invoice status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <OrganizationSelector
              value={localValue.partner_organization_id || ''}
              onChange={(partnerId) => {
                handleFilterChange('partner_organization_id', partnerId);
                // Clear location filter when partner changes
                if (localValue.location_filter?.length) {
                  handleFilterChange('location_filter', []);
                }
              }}
              organizationType="partner"
              placeholder="Select Partner"
            />
          </div>

          {/* Locations Filter */}
          {localValue.partner_organization_id && (
            <div>
              <label className="text-sm font-medium mb-2 block">Locations</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={localValue.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder="Select locations..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Subcontractor Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subcontractor</label>
            <OrganizationSelector
              value={localValue.subcontractor_organization_id || ''}
              onChange={(subcontractorId) => handleFilterChange('subcontractor_organization_id', subcontractorId)}
              organizationType="subcontractor"
              placeholder="Select Subcontractor"
            />
          </div>

          {/* Operational Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Work Status</label>
            <MultiSelectFilter
              options={operationalStatusOptions}
              selectedValues={localValue.operational_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('operational_status', filterValue)}
              placeholder="Filter by work status..."
              className="w-full h-10"
            />
          </div>

          {/* Report Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Report Status</label>
            <MultiSelectFilter
              options={reportStatusOptions}
              selectedValues={localValue.report_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('report_status', filterValue)}
              placeholder="Filter by report status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Billing Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Billing Status</label>
            <MultiSelectFilter
              options={partnerBillingStatusOptions}
              selectedValues={localValue.partner_billing_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('partner_billing_status', filterValue)}
              placeholder="Filter by billing status..."
              className="w-full h-10"
            />
          </div>
        </div>
        
        {/* Fixed bottom action buttons */}
        <div className="flex justify-between p-4 border-t bg-background">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear
          </Button>
          <Button onClick={handleApplyFilters}>
            Apply
          </Button>
        </div>
      </div>
    );
  };

  // Desktop: Popover
  if (!isMobile) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeCount > 0 && ` (${activeCount})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <FilterContent />
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: Full-screen overlay
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1"
        onClick={() => setIsOpen(true)}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {activeCount > 0 && ` (${activeCount})`}
      </Button>
      <MobileFilterOverlay />
    </>
  );
}