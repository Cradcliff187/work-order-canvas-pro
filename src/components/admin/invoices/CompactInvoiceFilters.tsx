import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Filter, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import type { InvoiceFiltersValue } from './InvoiceFilters';


const paymentStatusOptions = [
  { value: 'pending', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'ready_to_bill', label: 'Ready to Bill' },
  { value: 'billed', label: 'Partner Invoiced' }
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
  
  // Calculate active filter count - match WorkOrders pattern exactly
  const activeCount = useMemo(() => {
    return [
      value.overdue,
      value.partner_organization_id,
      value.location_filter?.length,
      value.subcontractor_organization_id,
      value.invoice_status?.length,
      value.partner_billing_status?.length
    ].filter(Boolean).length;
  }, [value]);

  // Handle filter changes - immediate updates like WorkOrders
  const handleFilterChange = (key: keyof InvoiceFiltersValue, filterValue: any) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleApplyFilters = () => {
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    if (onClear) {
      onClear();
    }
    setIsOpen(false);
  };

  // Filter content component
  const FilterContent = () => {
    const { data: partnerLocations } = usePartnerLocations(value.partner_organization_id);
    
    const locationOptions = useMemo(() => {
      if (!partnerLocations) return [];
      return partnerLocations.map(location => ({
        value: location.location_name,
        label: `${location.location_name} (${location.location_number})`
      }));
    }, [partnerLocations]);

    return (
      <>
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* Overdue Quick Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Filters</label>
            <Button
              variant={value.overdue ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('overdue', !value.overdue)}
              className="w-full h-10 justify-start"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Overdue Only
            </Button>
          </div>

          {/* Bill Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bill Status</label>
            <MultiSelectFilter
              options={[
                { value: 'submitted', label: 'Submitted' },
                { value: 'reviewed', label: 'Under Review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              selectedValues={value.invoice_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('invoice_status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Payment Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Status</label>
            <MultiSelectFilter
              options={paymentStatusOptions}
              selectedValues={value.partner_billing_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('partner_billing_status', filterValue)}
              placeholder="Filter by payment..."
              className="w-full h-10"
            />
          </div>

          {/* Subcontractor Organization */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subcontractor</label>
            <OrganizationSelector
              value={value.subcontractor_organization_id}
              onChange={(orgId) => handleFilterChange('subcontractor_organization_id', orgId)}
              organizationType="subcontractor"
              placeholder="Select subcontractor..."
              className="h-10"
            />
          </div>

          {/* Partner Organization */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <OrganizationSelector
              value={value.partner_organization_id}
              onChange={(orgId) => {
                handleFilterChange('partner_organization_id', orgId);
                // Clear locations when partner changes
                if (orgId !== value.partner_organization_id) {
                  handleFilterChange('location_filter', []);
                }
              }}
              organizationType="partner"
              placeholder="Select partner..."
              className="h-10"
            />
          </div>

          {/* Locations (only if partner selected) */}
          {value.partner_organization_id && (
            <div>
              <label className="text-sm font-medium mb-2 block">Locations</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={value.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder="Select locations..."
                className="w-full h-10"
              />
            </div>
          )}
        </div>
        
        {/* Action buttons - desktop only */}
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
    const { data: partnerLocations } = usePartnerLocations(value.partner_organization_id);
    
    const locationOptions = useMemo(() => {
      if (!partnerLocations) return [];
      return partnerLocations.map(location => ({
        value: location.location_name,
        label: `${location.location_name} (${location.location_number})`
      }));
    }, [partnerLocations]);

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
          {/* Overdue Quick Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Filters</label>
            <Button
              variant={value.overdue ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange('overdue', !value.overdue)}
              className="w-full h-10 justify-start"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Overdue Only
            </Button>
          </div>

          {/* Bill Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bill Status</label>
            <MultiSelectFilter
              options={[
                { value: 'submitted', label: 'Submitted' },
                { value: 'reviewed', label: 'Under Review' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              selectedValues={value.invoice_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('invoice_status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Payment Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Status</label>
            <MultiSelectFilter
              options={paymentStatusOptions}
              selectedValues={value.partner_billing_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('partner_billing_status', filterValue)}
              placeholder="Filter by payment..."
              className="w-full h-10"
            />
          </div>

          {/* Subcontractor Organization */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subcontractor</label>
            <OrganizationSelector
              value={value.subcontractor_organization_id}
              onChange={(orgId) => handleFilterChange('subcontractor_organization_id', orgId)}
              organizationType="subcontractor"
              placeholder="Select subcontractor..."
              className="h-10"
            />
          </div>

          {/* Partner Organization */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <OrganizationSelector
              value={value.partner_organization_id}
              onChange={(orgId) => {
                handleFilterChange('partner_organization_id', orgId);
                // Clear locations when partner changes
                if (orgId !== value.partner_organization_id) {
                  handleFilterChange('location_filter', []);
                }
              }}
              organizationType="partner"
              placeholder="Select partner..."
              className="h-10"
            />
          </div>

          {/* Locations (only if partner selected) */}
          {value.partner_organization_id && (
            <div>
              <label className="text-sm font-medium mb-2 block">Locations</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={value.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder="Select locations..."
                className="w-full h-10"
              />
            </div>
          )}
        </div>
        
        {/* Bottom action buttons */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1">
              Clear
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {isMobile ? (
        <>
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
          <MobileFilterOverlay />
        </>
      ) : (
        /* Desktop popover */
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <FilterContent />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}