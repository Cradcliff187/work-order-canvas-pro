import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizations } from '@/hooks/useOrganizations';

export interface PartnerInvoiceFiltersValue {
  status?: string[];
  partner_organization_id?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
}

export interface CompactPartnerInvoiceFiltersProps {
  value: PartnerInvoiceFiltersValue;
  onChange: (value: PartnerInvoiceFiltersValue) => void;
  onClear?: () => void;
}

const invoiceStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const CompactPartnerInvoiceFilters: React.FC<CompactPartnerInvoiceFiltersProps> = ({
  value,
  onChange,
  onClear
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const { data: organizations } = useOrganizations();

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.status?.length,
      value.partner_organization_id?.length,
      value.date_from || value.date_to,
      value.amount_min || value.amount_max
    ].filter(Boolean).length;
  }, [value]);

  // Prepare partner organization options
  const partnerOptions = useMemo(() => {
    return organizations?.filter(org => org.organization_type === 'partner')
      .map(org => ({
        value: org.id,
        label: org.name
      })) || [];
  }, [organizations]);

  // Handle filter changes
  const handleFilterChange = (key: keyof PartnerInvoiceFiltersValue, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleStringFilterChange = (key: keyof PartnerInvoiceFiltersValue, filterValue: string) => {
    onChange({
      ...value,
      [key]: filterValue || undefined
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onChange({
      ...value,
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined
    });
    setShowDateFrom(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onChange({
      ...value,
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined
    });
    setShowDateTo(false);
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
            <label className="text-sm font-medium mb-2 block">Status</label>
            <MultiSelectFilter
              options={invoiceStatusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <MultiSelectFilter
              options={partnerOptions}
              selectedValues={value.partner_organization_id || []}
              onSelectionChange={(filterValue) => handleFilterChange('partner_organization_id', filterValue)}
              placeholder="Filter by partner..."
              className="w-full h-10"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_from ? format(new Date(value.date_from), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.date_from ? new Date(value.date_from) : undefined}
                    onSelect={handleDateFromChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_to ? format(new Date(value.date_to), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.date_to ? new Date(value.date_to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amount Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min amount"
                value={value.amount_min || ''}
                onChange={(e) => handleStringFilterChange('amount_min', e.target.value)}
                className="h-10"
              />
              <Input
                type="number"
                placeholder="Max amount"
                value={value.amount_max || ''}
                onChange={(e) => handleStringFilterChange('amount_max', e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t bg-background/95 backdrop-blur">
          <Button variant="outline" onClick={handleClearFilters} className="flex-1 h-12">
            Clear
          </Button>
          <Button onClick={handleApplyFilters} className="flex-1 h-12">
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
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <MultiSelectFilter
              options={invoiceStatusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Partner Organization</label>
            <MultiSelectFilter
              options={partnerOptions}
              selectedValues={value.partner_organization_id || []}
              onSelectionChange={(filterValue) => handleFilterChange('partner_organization_id', filterValue)}
              placeholder="Filter by partner..."
              className="w-full h-10"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_from ? format(new Date(value.date_from), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={true}>
                  <Calendar
                    mode="single"
                    selected={value.date_from ? new Date(value.date_from) : undefined}
                    onSelect={handleDateFromChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal flex-1",
                      !value.date_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_to ? format(new Date(value.date_to), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={true}>
                  <Calendar
                    mode="single"
                    selected={value.date_to ? new Date(value.date_to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amount Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min amount"
                value={value.amount_min || ''}
                onChange={(e) => handleStringFilterChange('amount_min', e.target.value)}
                className="h-10"
              />
              <Input
                type="number"
                placeholder="Max amount"
                value={value.amount_max || ''}
                onChange={(e) => handleStringFilterChange('amount_max', e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClearFilters} className="flex-1 h-12">
              Clear
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1 h-12">
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Main render - mobile vs desktop
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="h-10"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
        <MobileFilterOverlay />
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <FilterContent />
      </PopoverContent>
    </Popover>
  );
};

// Hook for counting active filters
export function usePartnerInvoiceFilterCount(filters: PartnerInvoiceFiltersValue) {
  return useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.partner_organization_id?.length) count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.amount_min || filters.amount_max) count++;
    return count;
  }, [filters]);
}