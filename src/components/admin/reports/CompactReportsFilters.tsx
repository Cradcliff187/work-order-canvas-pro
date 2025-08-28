import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useSubcontractorOrganizations } from '@/hooks/useSubcontractorOrganizations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReportsFiltersValue {
  search?: string;
  status?: string[];
  date_from?: string;
  date_to?: string;
  partner_organization_ids?: string[];
  subcontractor_organization_ids?: string[];
  trade_ids?: string[];
  location_filter?: string[];
}

export interface FilterConfig {
  statusOptions?: { value: string; label: string }[];
  showPartnerFilter?: boolean;
  showSubcontractorFilter?: boolean;
  showTradeFilter?: boolean;
  showLocationFilter?: boolean;
}

export interface CompactReportsFiltersProps {
  value: ReportsFiltersValue;
  onChange: (value: ReportsFiltersValue) => void;
  onClear?: () => void;
  config?: FilterConfig;
}

const defaultStatusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const CompactReportsFilters: React.FC<CompactReportsFiltersProps> = ({
  value,
  onChange,
  onClear,
  config = {}
}) => {
  const {
    statusOptions = defaultStatusOptions,
    showPartnerFilter = true,
    showSubcontractorFilter = true,
    showTradeFilter = true,
    showLocationFilter = true,
  } = config;
  
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  // Data fetching
  const { data: organizations = [] } = useOrganizationsForWorkOrders();
  const { data: trades = [] } = useTrades();
  const { data: subcontractorOrganizations = [] } = useSubcontractorOrganizations();
  
  // Partner organizations
  const partnerOrganizations = organizations.filter(org => org.organization_type === 'partner');
  
  // Partner locations (dependent on selected partners)
  const { data: locations = [] } = useQuery({
    queryKey: ['report-locations', value.partner_organization_ids],
    queryFn: async () => {
      if (!value.partner_organization_ids?.length) return [];
      
      const { data: partnerLocations } = await supabase
        .from('partner_locations')
        .select('*')
        .in('organization_id', value.partner_organization_ids);
      
      if (!partnerLocations) return [];
      
      return [...new Set(partnerLocations.map(loc => loc.location_name))].filter(Boolean).sort();
    },
    enabled: !!value.partner_organization_ids?.length
  });

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.status?.length,
      value.partner_organization_ids?.length,
      value.subcontractor_organization_ids?.length,
      value.trade_ids?.length,
      value.location_filter?.length,
      value.date_from,
      value.date_to
    ].filter(Boolean).length;
  }, [value]);

  // Prepare option arrays
  const partnerOptions = partnerOrganizations.map(org => ({
    value: org.id,
    label: org.name
  }));

  const subcontractorOptions = subcontractorOrganizations.map(org => ({
    value: org.id,
    label: org.name
  }));

  const tradeOptions = trades.map(trade => ({
    value: trade.id,
    label: trade.name
  }));

  const locationOptions = locations.map(location => ({
    value: location,
    label: location
  }));

  // Handle filter changes
  const handleFilterChange = (key: string, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleStringFilterChange = (key: string, filterValue: string) => {
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
            <label className="text-sm font-medium mb-2 block">Report Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          {showPartnerFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Partner Organization</label>
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
          {showSubcontractorFilter && (
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

          {/* Date Submitted Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Submitted</label>
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

          {/* Locations Filter */}
          {showLocationFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Locations</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={value.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder={value.partner_organization_ids?.length ? "Select locations..." : "Select partner first"}
                disabled={!value.partner_organization_ids?.length}
                className="w-full h-10"
              />
            </div>
          )}

          {/* Trade Filter */}
          {showTradeFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Trade</label>
              <MultiSelectFilter
                options={tradeOptions}
                selectedValues={value.trade_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('trade_ids', filterValue)}
                placeholder="Filter by trade..."
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
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Report Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className="w-full h-10"
            />
          </div>

          {/* Partner Organization Filter */}
          {showPartnerFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Partner Organization</label>
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
          {showSubcontractorFilter && (
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

          {/* Date Submitted Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">Date Submitted</label>
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

          {/* Locations Filter */}
          {showLocationFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Locations</label>
              <MultiSelectFilter
                options={locationOptions}
                selectedValues={value.location_filter || []}
                onSelectionChange={(filterValue) => handleFilterChange('location_filter', filterValue)}
                placeholder={value.partner_organization_ids?.length ? "Select locations..." : "Select partner first"}
                disabled={!value.partner_organization_ids?.length}
                className="w-full h-10"
              />
            </div>
          )}

          {/* Trade Filter */}
          {showTradeFilter && (
            <div>
              <label className="text-sm font-medium mb-2 block">Trade</label>
              <MultiSelectFilter
                options={tradeOptions}
                selectedValues={value.trade_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('trade_ids', filterValue)}
                placeholder="Filter by trade..."
                className="w-full h-10"
              />
            </div>
          )}

        </div>

        {/* Sticky action buttons */}
        <div className="border-t bg-background p-4">
          <div className="flex justify-between gap-3">
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
              className="flex-1"
            >
              Clear Filters
            </Button>
            <Button 
              onClick={handleApplyFilters}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
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
          onClick={() => setIsOpen(true)}
          className="h-9 relative"
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
        <Button
          variant="outline"
          className="h-9 relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-background border shadow-lg z-50" align="end">
        <FilterContent />
      </PopoverContent>
    </Popover>
  );
};