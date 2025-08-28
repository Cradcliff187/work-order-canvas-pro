import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Input } from '@/components/ui/input';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';

export interface InvoiceFiltersValue {
  search?: string;
  overdue?: boolean;
  invoice_status?: string[];
  partner_organization_id?: string;
  location_filter?: string[];
  amount_range?: {
    min?: number;
    max?: number;
  };
}

export interface FilterConfig {
  statusOptions?: { value: string; label: string }[];
  showAmountRange?: boolean;
  showLocationFilter?: boolean;
}

export interface CompactInvoiceFiltersProps {
  value: InvoiceFiltersValue;
  onChange: (value: InvoiceFiltersValue) => void;
  onClear?: () => void;
  config?: FilterConfig;
}

const defaultInvoiceStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export const CompactInvoiceFilters: React.FC<CompactInvoiceFiltersProps> = ({
  value,
  onChange,
  onClear,
  config = {}
}) => {
  const {
    statusOptions = defaultInvoiceStatusOptions,
    showAmountRange = true,
    showLocationFilter = true
  } = config;
  
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [minAmount, setMinAmount] = useState(value.amount_range?.min?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(value.amount_range?.max?.toString() || '');

  const { data: organizations } = useOrganizations();
  const { data: partnerLocations } = usePartnerLocations(value.partner_organization_id);

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.invoice_status?.length,
      value.partner_organization_id,
      value.location_filter?.length,
      value.overdue,
      value.amount_range?.min || value.amount_range?.max
    ].filter(Boolean).length;
  }, [value]);

  // Prepare option arrays
  const organizationOptions = useMemo(() => {
    return organizations
      ?.filter(org => org.organization_type === 'partner')
      .map(org => ({ value: org.id, label: org.name })) || [];
  }, [organizations]);

  const locationOptions = useMemo(() => {
    return partnerLocations?.map(location => ({
      value: location.location_name,
      label: `${location.location_name} (${location.location_number || ''})`
    })) || [];
  }, [partnerLocations]);

  // Handle filter changes
  const handleFilterChange = (key: string, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleSingleValueChange = (key: string, filterValue: string | boolean | undefined) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleAmountRangeUpdate = (min: string, max: string) => {
    const minValue = min ? parseFloat(min) : undefined;
    const maxValue = max ? parseFloat(max) : undefined;
    
    if (minValue || maxValue) {
      onChange({
        ...value,
        amount_range: {
          min: minValue,
          max: maxValue
        }
      });
    } else {
      onChange({
        ...value,
        amount_range: undefined
      });
    }
  };

  const handleMinAmountChange = (newValue: string) => {
    setMinAmount(newValue);
    handleAmountRangeUpdate(newValue, maxAmount);
  };

  const handleMaxAmountChange = (newValue: string) => {
    setMaxAmount(newValue);
    handleAmountRangeUpdate(minAmount, newValue);
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
    return (
      <>
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Invoice Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.invoice_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('invoice_status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <MultiSelectFilter
              options={organizationOptions}
              selectedValues={value.partner_organization_id ? [value.partner_organization_id] : []}
              onSelectionChange={(filterValue) => {
                handleSingleValueChange('partner_organization_id', filterValue[0] || undefined);
                // Clear location filter when partner changes
                if (value.location_filter?.length) {
                  onChange({
                    ...value,
                    partner_organization_id: filterValue[0] || undefined,
                    location_filter: undefined
                  });
                }
              }}
              placeholder="Filter by partner..."
              className="w-full h-10"
            />
          </div>

          {/* Location Filter */}
          {showLocationFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={value.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder="Filter by location..."
                className="w-full h-10"
                disabled={!value.partner_organization_id}
              />
            </div>
          )}

          {/* Payment Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Status</label>
            <MultiSelectFilter
              options={[
                { value: 'all', label: 'All Invoices' },
                { value: 'overdue', label: 'Overdue Only' }
              ]}
              selectedValues={value.overdue ? ['overdue'] : ['all']}
              onSelectionChange={(filterValue) => {
                handleSingleValueChange('overdue', filterValue.includes('overdue'));
              }}
              placeholder="Filter by payment status..."
              className="w-full h-10"
            />
          </div>

          {/* Amount Range Filter */}
          {showAmountRange && (
            <div>
              <label className="text-sm font-medium mb-2 block">Amount Range</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={minAmount}
                  onChange={(e) => handleMinAmountChange(e.target.value)}
                  className="flex-1 h-10"
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={maxAmount}
                  onChange={(e) => handleMaxAmountChange(e.target.value)}
                  className="flex-1 h-10"
                />
              </div>
            </div>
          )}
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
        <div className="flex-1 overflow-y-auto p-4">
          <FilterContent />
        </div>
      </div>
    );
  };

  // Render mobile overlay or desktop popover
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className={cn(
            "shrink-0 h-9 px-3",
            activeCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </Button>
        <MobileFilterOverlay />
      </>
    );
  }

  // Desktop popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "shrink-0 h-10 px-3",
            activeCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 z-50 bg-popover" 
        align="end"
        side="bottom"
        sideOffset={4}
      >
        <FilterContent />
      </PopoverContent>
    </Popover>
  );
};