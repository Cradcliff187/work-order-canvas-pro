import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Filter, CalendarIcon, X } from 'lucide-react';
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
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
];

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

// Default config constant to prevent re-render loops
const DEFAULT_CONFIG: FilterConfig = {};

export const CompactSubcontractorBillFilters: React.FC<CompactSubcontractorBillFiltersProps> = ({
  value,
  onChange,
  onClear,
  config = DEFAULT_CONFIG
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

  const { data: partnerOrganizations, isLoading: isLoadingPartners } = useQuery({
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
  
  const { data: subcontractorOrganizations, isLoading: isLoadingSubcontractors } = useSubcontractorOrganizations();

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.status?.length,
      value.subcontractor_organization_ids?.length, 
      value.date_range?.from,
      value.date_range?.to,
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


  // Handle filter changes
  const handleFilterChange = useCallback((key: string, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  }, [value, onChange]);

  const handleDateFromChange = useCallback((date: Date | undefined) => {
    onChange({
      ...value,
      date_range: {
        ...value.date_range,
        from: date ? format(date, 'yyyy-MM-dd') : undefined
      }
    });
    setShowDateFrom(false);
  }, [value, onChange]);

  const handleDateToChange = useCallback((date: Date | undefined) => {
    onChange({
      ...value,
      date_range: {
        ...value.date_range,
        to: date ? format(date, 'yyyy-MM-dd') : undefined
      }
    });
    setShowDateTo(false);
  }, [value, onChange]);

  const handleApplyFilters = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    if (onClear) {
      onClear();
    }
    setIsOpen(false);
  }, [onClear]);

  // Focus management for mobile overlay
  useEffect(() => {
    if (isMobile && isOpen) {
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobile, isOpen]);

  // Shared filter content component with performance optimization
  const FilterContent = React.memo(({ isMobileVersion = false }: { isMobileVersion?: boolean }) => {
    const containerClass = isMobileVersion 
      ? "space-y-6 max-h-none" // More space on mobile
      : "space-y-4 max-h-[500px] overflow-y-auto";

    const filterItemClass = isMobileVersion 
      ? "space-y-3" // More space between items on mobile
      : "";

    const inputClass = isMobileVersion
      ? "w-full min-h-[44px]" // Ensure 44px touch targets on mobile
      : "w-full h-10";

    return (
      <>
        <div className={containerClass}>
          {/* Bill Status Filter */}
          <div className={filterItemClass}>
            <label className="text-sm font-medium mb-2 block text-foreground">Bill Status</label>
            <MultiSelectFilter
              options={statusOptions}
              selectedValues={value.status || []}
              onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
              placeholder="Filter by status..."
              className={inputClass}
            />
          </div>

          {isMobileVersion && <div className="border-t border-border/50" />}


          {isMobileVersion && showSubcontractor && <div className="border-t border-border/50" />}

          {/* Subcontractor Filter */}
          {showSubcontractor && (
            <div className={filterItemClass}>
              <label className="text-sm font-medium mb-2 block text-foreground">Subcontractor</label>
              <MultiSelectFilter
                options={subcontractorOptions}
                selectedValues={value.subcontractor_organization_ids || []}
                onSelectionChange={(filterValue) => handleFilterChange('subcontractor_organization_ids', filterValue)}
                placeholder={isLoadingSubcontractors ? "Loading subcontractors..." : "Filter by subcontractor..."}
                disabled={isLoadingSubcontractors}
                className={inputClass}
              />
            </div>
          )}

          {isMobileVersion && <div className="border-t border-border/50" />}

          {/* Date Range */}
          <div className={filterItemClass}>
            <label className="text-sm font-medium mb-2 block text-foreground">Date Range</label>
            <div className={cn("grid gap-2", isMobileVersion ? "grid-cols-1 space-y-2" : "grid-cols-2")}>
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      isMobileVersion ? "w-full min-h-[44px]" : "w-full h-10 flex-1",
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
                      "justify-start text-left font-normal",
                      isMobileVersion ? "w-full min-h-[44px]" : "w-full h-10 flex-1",
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

        </div>
        
        {/* Action buttons */}
        <div className={cn("flex pt-4 border-t border-border/50", isMobileVersion ? "gap-3" : "justify-between")}>
          <Button 
            variant="outline" 
            onClick={handleClearFilters}
            className={cn(isMobileVersion && "flex-1 min-h-[44px]")}
          >
            Clear
          </Button>
          <Button 
            onClick={handleApplyFilters}
            className={cn(isMobileVersion && "flex-1 min-h-[44px]")}
          >
            Apply
          </Button>
        </div>
      </>
    );
  });

  // Enhanced mobile full-screen overlay component
  const MobileFilterOverlay = React.memo(() => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
        <div className="flex flex-col h-full safe-area-inset">
          {/* Enhanced Header with better styling */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Filters</h2>
              {activeCount > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeCount} filter{activeCount !== 1 ? 's' : ''} applied
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-9 w-9 p-0 hover:bg-muted rounded-full"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Scrollable content with safe area padding */}
          <div className="flex-1 overflow-y-auto px-4 py-6 pb-safe-offset-4">
            <FilterContent isMobileVersion={true} />
          </div>
        </div>
      </div>
    );
  });

  return (
    <>
      {isMobile ? (
        <>
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="relative min-h-[44px] px-4 transition-all duration-200 hover:scale-[1.02]"
            aria-label={`Open filters${activeCount > 0 ? `, ${activeCount} applied` : ''}`}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs min-w-[1.5rem] h-6 flex items-center justify-center font-medium animate-scale-in">
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
              className="relative transition-all duration-200 hover:scale-[1.02]"
              aria-label={`Open filters${activeCount > 0 ? `, ${activeCount} applied` : ''}`}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs min-w-[1.5rem] h-6 flex items-center justify-center font-medium animate-scale-in">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 z-50 bg-popover border border-border shadow-lg" align="end">
            <FilterContent isMobileVersion={false} />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};