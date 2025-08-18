
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Search, Filter, Calendar as CalendarIcon, X, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { useAllAssignees } from '@/hooks/useEmployeesForAssignment';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';


interface WorkOrderFiltersProps {
  filters: {
    status?: string[];
    trade_id?: string[];
    partner_organization_ids?: string[];
    completed_by?: string[]; // 'internal' and/or subcontractor org IDs
    search?: string;
    date_from?: string;
    date_to?: string;
    location_filter?: string[];
  };
  searchTerm: string;
  onFiltersChange: (filters: any) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
}

const statusOptions = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'estimate_needed', label: 'Estimate Needed' },
  { value: 'estimate_approved', label: 'Estimate Approved' },
];

const organizationTypeOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'subcontractor', label: 'Subcontractor' },
];

export function WorkOrderFilters({ filters, searchTerm, onFiltersChange, onSearchChange, onClearFilters }: WorkOrderFiltersProps) {
  const { toast } = useToast();
  const { data: organizations } = useOrganizationsForWorkOrders();
  const { data: trades } = useTrades();
  const { data: subcontractors } = useQuery({
    queryKey: ['subcontractor-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('organization_type', 'subcontractor')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  const { shouldShowSelector } = useAutoOrganization();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDesktopSheetOpen, setIsDesktopSheetOpen] = useState(false);
  const [locationTextInput, setLocationTextInput] = useState('');

  // Calculate active filter count for display
  const activeFilterCount = useMemo(() => {
    const baseCount = Object.values(filters).filter(value => 
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    ).length + (searchTerm ? 1 : 0);
    return baseCount;
  }, [filters, searchTerm]);

  // Get partner locations to match partner page format exactly  
  const { data: locations } = usePartnerLocations();

  // Suggestion sources
  const { data: woSuggestionSource } = useQuery({
    queryKey: ['work-order-suggestions', (filters.partner_organization_ids || []).join(',')],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select('id, work_order_number, store_location, description')
        .order('created_at', { ascending: false })
        .limit(50);
      if (filters.partner_organization_ids && filters.partner_organization_ids.length > 0) {
        query = query.in('organization_id', filters.partner_organization_ids as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { employees } = useAllAssignees();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );


  const hasActiveFilters = Boolean(searchTerm) || Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  const handleLocationTextSubmit = (value: string) => {
    if (value.trim()) {
      onFiltersChange({
        ...filters,
        location_filter: [value.trim()]
      });
      setLocationTextInput('');
    }
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({ 
      ...filters, 
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined 
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({ 
      ...filters, 
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined 
    });
  };

  // Helper function to render search filter
  const renderSearchFilter = () => (
    <div className="space-y-2">
      <label htmlFor="work-order-search" className="text-sm font-medium text-foreground">Search</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
        <SmartSearchInput
          id="work-order-search"
          placeholder="Search WO#, title, or location..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10"
          aria-label="Search work orders by number, title, or location"
          storageKey="work-orders-filters-search"
          workOrders={(woSuggestionSource || []).map((wo: any) => ({
            id: String(wo.id),
            label: wo.work_order_number || '',
            subtitle: wo.store_location || (wo.description ? String(wo.description).slice(0, 80) : undefined),
          }))}
          assignees={(employees || []).map((emp) => ({
            id: emp.id,
            label: [emp.first_name, emp.last_name].filter(Boolean).join(' '),
            subtitle: emp.organization,
          }))}
          locations={(locations || []).map((location) => ({
            id: `loc-${location.location_number}`,
            label: `${location.location_name} (${location.location_number})`,
          }))}
          onSearchSubmit={(q) => onSearchChange(q)}
          onSelectSuggestion={(item) => onSearchChange(item.label)}
        />
      </div>
    </div>
  );

  // Helper function to render status filter
  const renderStatusFilter = () => (
    <div className="space-y-2">
      <label htmlFor="status-filter" className="text-sm font-medium text-foreground">Status</label>
      <MultiSelectFilter
        options={statusOptions}
        selectedValues={filters.status || []}
        onSelectionChange={(values) => onFiltersChange({ 
          ...filters, 
          status: values.length > 0 ? values : undefined 
        })}
        placeholder="All Statuses"
        searchPlaceholder="Search statuses..."
        className="h-10"
        aria-label="Filter by work order status"
      />
    </div>
  );

  // Helper function to render organization filter
  const renderOrganizationFilter = () => (
    shouldShowSelector ? (
      <div className="space-y-2">
        <label htmlFor="partner-filter" className="text-sm font-medium text-foreground">Partner</label>
        <MultiSelectFilter
          options={Array.isArray(organizations) ? organizations.map((org) => ({ value: org.id || `org-${org.name}`, label: org.name })) : []}
          selectedValues={filters.partner_organization_ids || []}
          onSelectionChange={(values) => onFiltersChange({ 
            ...filters, 
            partner_organization_ids: values.length > 0 ? values : undefined,
            location_filter: [] // Clear location filter when partner changes
          })}
          placeholder="All Partners"
          searchPlaceholder="Search partners..."
          className="h-10"
        />
      </div>
    ) : null
  );

  // Helper function to render completed-by filter
  const renderCompletedByFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Work completed by</label>
      <MultiSelectFilter
        options={[
          { value: 'internal', label: 'Internal Team' },
          ...((Array.isArray(subcontractors) ? subcontractors : []).map((o: any) => ({ value: o.id, label: o.name })))
        ]}
        selectedValues={filters.completed_by || []}
        onSelectionChange={(values) => onFiltersChange({
          ...filters,
          completed_by: values.length > 0 ? values : undefined,
        })}
        placeholder="Internal and/or subcontractors"
        searchPlaceholder="Search organizations..."
        className="h-10"
      />
    </div>
  );

  // Helper function to render location filter to match partner format exactly
  const renderLocationFilter = () => (
    shouldShowSelector ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Location</label>
        <MultiSelectFilter
          options={(locations || []).map((location) => ({ 
            value: location.location_number, 
            label: `${location.location_name} (${location.location_number})` 
          }))}
          selectedValues={filters.location_filter || []}
          onSelectionChange={(values) => onFiltersChange({ 
            ...filters, 
            location_filter: values.length > 0 ? values : undefined 
          })}
          placeholder="All Locations"
          searchPlaceholder="Search locations..."
          className="h-10"
        />
      </div>
    ) : null
  );

  // Helper function to render trade filter
  const renderTradeFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Trade</label>
      <MultiSelectFilter
        options={Array.isArray(trades) ? trades.map(trade => ({ value: trade.id || `trade-${trade.name}`, label: trade.name })) : []}
        selectedValues={filters.trade_id || []}
        onSelectionChange={(values) => onFiltersChange({ 
          ...filters, 
          trade_id: values.length > 0 ? values : undefined 
        })}
        placeholder="All Trades"
        searchPlaceholder="Search trades..."
        className="h-10"
      />
    </div>
  );

  // Helper function to render date range filter
  const renderDateRangeFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Date Range</label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal h-10",
                !dateFrom && "text-muted-foreground"
              )}
              aria-label={dateFrom ? `Start date selected: ${format(dateFrom, "MMMM dd, yyyy")}` : "Select start date"}
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {dateFrom ? format(dateFrom, "MMM dd") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={handleDateFromChange}
              initialFocus
              className="pointer-events-auto"
              aria-label="Select start date for date range filter"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal h-10",
                !dateTo && "text-muted-foreground"
              )}
              aria-label={dateTo ? `End date selected: ${format(dateTo, "MMMM dd, yyyy")}` : "Select end date"}
              aria-haspopup="dialog"
              aria-expanded="false"
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {dateTo ? format(dateTo, "MMM dd") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={handleDateToChange}
              initialFocus
              className="pointer-events-auto"
              aria-label="Select end date for date range filter"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile search bar always visible */}
        <div className="p-4 border rounded-lg bg-card/50 backdrop-blur-sm">
          {renderSearchFilter()}
        </div>

        {/* Filter trigger button */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full h-12 justify-between px-4"
              aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-[85vh] p-0 max-w-full overflow-x-hidden">
            <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </SheetTitle>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      onClearFilters();
                      setIsSheetOpen(false);
                    }}
                    className="h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Essential filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Essential
                </h3>
                <div className="space-y-4">
                  {renderStatusFilter()}
                </div>
              </div>

              {/* Advanced filters */}
              {(shouldShowSelector || true) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Advanced
                  </h3>
                  <div className="space-y-4">
                    {renderOrganizationFilter()}
                    {renderCompletedByFilter()}
                    {renderLocationFilter()}
                    {renderTradeFilter()}
                    {renderDateRangeFilter()}
                  </div>
                </div>
              )}
            </div>

            <SheetFooter className="p-4 border-t bg-background">
              <Button 
                onClick={() => setIsSheetOpen(false)}
                className="w-full h-11"
              >
                Apply Filters
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop search bar always visible */}
      <div className="p-4 border rounded-lg bg-card/50 backdrop-blur-sm">
        {renderSearchFilter()}
      </div>

      {/* Desktop filter sidebar */}
      <Sheet open={isDesktopSheetOpen} onOpenChange={setIsDesktopSheetOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full h-12 justify-between px-4"
            aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[420px] p-0 max-w-full overflow-x-hidden">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </SheetTitle>
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    onClearFilters();
                    setIsDesktopSheetOpen(false);
                  }}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Essential filters */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Essential
              </h3>
              <div className="space-y-4">
                {renderStatusFilter()}
              </div>
            </div>

            {/* Advanced filters */}
            {(shouldShowSelector || true) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Advanced
                </h3>
                <div className="space-y-4">
                  {renderOrganizationFilter()}
                  {renderCompletedByFilter()}
                  {renderLocationFilter()}
                  {renderTradeFilter()}
                  {renderDateRangeFilter()}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="p-4 border-t bg-background">
            <Button 
              onClick={() => setIsDesktopSheetOpen(false)}
              className="w-full h-11"
            >
              Apply Filters
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
