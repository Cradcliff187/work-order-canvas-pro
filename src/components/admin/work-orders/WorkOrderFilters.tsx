
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, Calendar as CalendarIcon, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';

interface WorkOrderFiltersProps {
  filters: {
    status?: string[];
    trade_id?: string[];
    organization_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    location_filter?: string[];
  };
  onFiltersChange: (filters: any) => void;
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

export function WorkOrderFilters({ filters, onFiltersChange, onClearFilters }: WorkOrderFiltersProps) {
  const { data: organizations } = useOrganizationsForWorkOrders();
  const { data: trades } = useTrades();
  const { shouldShowSelector } = useAutoOrganization();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique locations for the selected organization (or all if no org selected)
  const { data: locations } = useQuery({
    queryKey: ['work-order-locations', filters.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select('store_location')
        .not('store_location', 'is', null)
        .not('store_location', 'eq', '');
      
      // If a specific organization is selected, filter by it
      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get unique locations
      const uniqueLocations = [...new Set(data.map(wo => wo.store_location))].filter(Boolean);
      return uniqueLocations.sort();
    },
    enabled: shouldShowSelector,
  });
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

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
      <label className="text-sm font-medium text-foreground">Search</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search WO#, title, or location..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );

  // Helper function to render status filter
  const renderStatusFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Status</label>
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
      />
    </div>
  );

  // Helper function to render organization filter
  const renderOrganizationFilter = () => (
    shouldShowSelector ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Organization</label>
        <Select
          value={filters.organization_id || 'all-organizations'}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            organization_id: value === 'all-organizations' ? undefined : value,
            location_filter: undefined // Clear location filter when organization changes
          })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All Organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-organizations">All Organizations</SelectItem>
            {Array.isArray(organizations) && organizations.map((org) => (
              <SelectItem key={org.id} value={org.id || `org-${org.name}`}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null
  );

  // Helper function to render location filter
  const renderLocationFilter = () => (
    shouldShowSelector ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Location</label>
        <MultiSelectFilter
          options={Array.isArray(locations) ? locations.map(location => ({ value: location, label: location })) : []}
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
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
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
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
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
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(filters).filter(value => 
                  Array.isArray(value) ? value.length > 0 : Boolean(value)
                ).length}
              </Badge>
            )}
          </h3>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters} className="h-10">
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Essential filters always visible */}
        <div className="grid grid-cols-1 gap-4">
          {renderSearchFilter()}
          {renderStatusFilter()}
        </div>

        {/* Advanced filters collapsible */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-10">
              Advanced Filters
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4">
              {renderOrganizationFilter()}
              {renderLocationFilter()}
              {renderTradeFilter()}
              {renderDateRangeFilter()}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card/50 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {Object.values(filters).filter(value => 
                Array.isArray(value) ? value.length > 0 : Boolean(value)
              ).length}
            </Badge>
          )}
        </h3>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="h-10">
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className={cn(
        "grid gap-4",
        shouldShowSelector 
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      )}>
        {renderSearchFilter()}
        {renderStatusFilter()}
        {renderOrganizationFilter()}
        {renderLocationFilter()}
        {renderTradeFilter()}
        {renderDateRangeFilter()}
      </div>
    </div>
  );
}
