import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { SubcontractorBillFiltersValue } from '@/types/subcontractor-bills';

export interface FilterConfig {
  statusOptions?: { value: string; label: string }[];
  showOverdue?: boolean;
  showPartner?: boolean;
  showSubcontractor?: boolean;
  showLocations?: boolean;
}

export interface CompactSubcontractorBillFiltersProps {
  value: SubcontractorBillFiltersValue;
  onChange: (value: SubcontractorBillFiltersValue) => void;
  onClear?: () => void;
  config?: FilterConfig;
}

const defaultBillStatusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export const CompactSubcontractorBillFilters: React.FC<CompactSubcontractorBillFiltersProps> = ({
  value,
  onChange,
  onClear,
  config = {}
}) => {
  const {
    statusOptions = defaultBillStatusOptions,
    showOverdue = true,
    showPartner = true,
    showSubcontractor = true,
    showLocations = true,
  } = config;
  
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const { data: partnerOrganizations } = useQuery({
    queryKey: ['partner-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('organization_type', 'partner')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: subcontractorOrganizations } = useSubcontractorOrganizations();
  const { data: locations } = usePartnerLocations();

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.status?.length,
      value.payment_status?.length,
      value.partner_organization_ids?.length,
      value.subcontractor_organization_ids?.length, 
      value.date_range?.from,
      value.date_range?.to,
      value.location_filter?.length,
      value.overdue
    ].filter(Boolean).length;
  }, [value]);

  // Prepare option arrays
  const partnerOptions = partnerOrganizations?.map(org => ({
    value: org.id,
    label: org.name
  })) || [];

  const subcontractorOptions = subcontractorOrganizations?.map(org => ({
    value: org.id,
    label: org.name
  })) || [];

  const locationOptions = useMemo(() => {
    const allLocations = (locations || []).map(loc => loc.location_name).filter(Boolean);
    const uniqueLocations = Array.from(new Set(allLocations));
    return uniqueLocations.map(loc => ({ value: loc, label: loc }));
  }, [locations]);

  // Handle filter changes
  const handleFilterChange = (key: string, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onChange({
      ...value,
      date_range: {
        ...value.date_range,
        from: date ? format(date, 'yyyy-MM-dd') : undefined
      }
    });
    setShowDateFrom(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onChange({
      ...value,
      date_range: {
        ...value.date_range,
        to: date ? format(date, 'yyyy-MM-dd') : undefined
      }
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
          {/* Bill Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bill Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Status</label>
            <MultiSelectFilter
              options={paymentStatusOptions}
              selectedValues={value.payment_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('payment_status', filterValue)}
              placeholder="Filter by payment status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Filter */}
          {showPartner && (
            <div>
              <label className="text-sm font-medium mb-2 block">Partner</label>
              <MultiSelectFilter
                options={partnerOptions}
                selectedValues={value.partner_organization_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('partner_organization_ids', filterValue)}
                placeholder="Filter by partner..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Subcontractor Filter */}
          {showSubcontractor && (
            <div>
              <label className="text-sm font-medium mb-2 block">Subcontractor</label>
              <MultiSelectFilter
                options={subcontractorOptions}
                selectedValues={value.subcontractor_organization_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('subcontractor_organization_ids', filterValue)}
                placeholder="Filter by subcontractor..."
                className="w-full h-10"
              />
            </div>
          )}

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
                      !value.date_range?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_range?.from ? format(new Date(value.date_range.from), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.date_range?.from ? new Date(value.date_range.from) : undefined}
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
                      !value.date_range?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_range?.to ? format(new Date(value.date_range.to), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={isMobile}>
                  <Calendar
                    mode="single"
                    selected={value.date_range?.to ? new Date(value.date_range.to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locations Filter */}
          {showLocations && (
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
          {/* Bill Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bill Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Status</label>
            <MultiSelectFilter
              options={paymentStatusOptions}
              selectedValues={value.payment_status || []}
              onSelectionChange={(filterValue) => handleFilterChange('payment_status', filterValue)}
              placeholder="Filter by payment status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Filter */}
          {showPartner && (
            <div>
              <label className="text-sm font-medium mb-2 block">Partner</label>
              <MultiSelectFilter
                options={partnerOptions}
                selectedValues={value.partner_organization_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('partner_organization_ids', filterValue)}
                placeholder="Filter by partner..."
                className="w-full h-10"
              />
            </div>
          )}

          {/* Subcontractor Filter */}
          {showSubcontractor && (
            <div>
              <label className="text-sm font-medium mb-2 block">Subcontractor</label>
              <MultiSelectFilter
                options={subcontractorOptions}
                selectedValues={value.subcontractor_organization_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('subcontractor_organization_ids', filterValue)}
                placeholder="Filter by subcontractor..."
                className="w-full h-10"
              />
            </div>
          )}

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
                      !value.date_range?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_range?.from ? format(new Date(value.date_range.from), "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={true}>
                  <Calendar
                    mode="single"
                    selected={value.date_range?.from ? new Date(value.date_range.from) : undefined}
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
                      !value.date_range?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value.date_range?.to ? format(new Date(value.date_range.to), "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" disablePortal={true}>
                  <Calendar
                    mode="single"
                    selected={value.date_range?.to ? new Date(value.date_range.to) : undefined}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locations Filter */}
          {showLocations && (
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
};