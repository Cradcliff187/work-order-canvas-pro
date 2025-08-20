import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { useOrganizationsForWorkOrders } from '@/hooks/useWorkOrders';
import { useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ReportsFiltersValue {
  status?: string[];
  date_from?: string;
  date_to?: string;
  partner_organization_ids?: string[];
  subcontractor_organization_ids?: string[];
  trade_ids?: string[];
  location_filter?: string[];
  submitted_by?: string;
  work_order?: string;
}

interface ReportsFiltersContentProps {
  value: ReportsFiltersValue;
  onChange: (filters: ReportsFiltersValue) => void;
  onClear?: () => void;
}

const statusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function ReportsFiltersContent({
  value,
  onChange,
  onClear
}: ReportsFiltersContentProps) {
  // Data fetching
  const { data: organizations = [] } = useOrganizationsForWorkOrders();
  const { data: trades = [] } = useTrades();
  
  // Partner and Subcontractor organizations
  const partnerOrganizations = organizations.filter(org => org.organization_type === 'partner');
  const subcontractorOrganizations = organizations.filter(org => org.organization_type === 'subcontractor');
  
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

  // Helper function to update filters
  const handleFilterChange = (key: keyof ReportsFiltersValue, filterValue: any) => {
    onChange({ ...value, [key]: filterValue });
  };

  // Handle date changes
  const handleDateFromChange = (date: Date | undefined) => {
    handleFilterChange('date_from', date ? format(date, 'yyyy-MM-dd') : undefined);
  };

  const handleDateToChange = (date: Date | undefined) => {
    handleFilterChange('date_to', date ? format(date, 'yyyy-MM-dd') : undefined);
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.status?.length) count += value.status.length;
    if (value.date_from) count++;
    if (value.date_to) count++;
    if (value.partner_organization_ids?.length) count += value.partner_organization_ids.length;
    if (value.subcontractor_organization_ids?.length) count += value.subcontractor_organization_ids.length;
    if (value.trade_ids?.length) count += value.trade_ids.length;
    if (value.location_filter?.length) count += value.location_filter.length;
    if (value.submitted_by) count++;
    if (value.work_order) count++;
    return count;
  }, [value]);

  // Prepare options for filters
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

  const renderStatusFilter = () => (
    <div className="space-y-2">
      <Label>Report Status</Label>
      <MultiSelectFilter
        options={statusOptions}
        selectedValues={value.status || []}
        onSelectionChange={(status) => handleFilterChange('status', status)}
        placeholder="Select status"
        maxDisplayCount={2}
      />
    </div>
  );

  const renderDateRangeFilter = () => (
    <div className="space-y-2">
      <Label>Date Range</Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.date_from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.date_from ? format(new Date(value.date_from), 'PPP') : 'From date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.date_from ? new Date(value.date_from) : undefined}
              onSelect={handleDateFromChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.date_to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.date_to ? format(new Date(value.date_to), 'PPP') : 'To date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.date_to ? new Date(value.date_to) : undefined}
              onSelect={handleDateToChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const renderPartnerOrganizationFilter = () => (
    <div className="space-y-2">
      <Label>Partner Organization</Label>
      <MultiSelectFilter
        options={partnerOptions}
        selectedValues={value.partner_organization_ids || []}
        onSelectionChange={(ids) => handleFilterChange('partner_organization_ids', ids)}
        placeholder="Select partners"
        maxDisplayCount={1}
      />
    </div>
  );

  const renderLocationFilter = () => (
    <div className="space-y-2">
      <Label>Location</Label>
      <MultiSelectFilter
        options={locationOptions}
        selectedValues={value.location_filter || []}
        onSelectionChange={(locations) => handleFilterChange('location_filter', locations)}
        placeholder={value.partner_organization_ids?.length ? "Select locations" : "Select partner first"}
        disabled={!value.partner_organization_ids?.length}
        maxDisplayCount={1}
      />
    </div>
  );

  const renderSubcontractorFilter = () => (
    <div className="space-y-2">
      <Label>Subcontractor Organization</Label>
      <MultiSelectFilter
        options={subcontractorOptions}
        selectedValues={value.subcontractor_organization_ids || []}
        onSelectionChange={(ids) => handleFilterChange('subcontractor_organization_ids', ids)}
        placeholder="Select subcontractors"
        maxDisplayCount={1}
      />
    </div>
  );

  const renderTradeFilter = () => (
    <div className="space-y-2">
      <Label>Trade</Label>
      <MultiSelectFilter
        options={tradeOptions}
        selectedValues={value.trade_ids || []}
        onSelectionChange={(ids) => handleFilterChange('trade_ids', ids)}
        placeholder="Select trades"
        maxDisplayCount={1}
      />
    </div>
  );

  const renderSubmittedByFilter = () => (
    <div className="space-y-2">
      <Label htmlFor="submitted-by">Submitted By</Label>
      <Input
        id="submitted-by"
        value={value.submitted_by || ''}
        onChange={(e) => handleFilterChange('submitted_by', e.target.value || undefined)}
        placeholder="Enter name or email"
      />
    </div>
  );

  const renderWorkOrderFilter = () => (
    <div className="space-y-2">
      <Label htmlFor="work-order">Work Order</Label>
      <Input
        id="work-order"
        value={value.work_order || ''}
        onChange={(e) => handleFilterChange('work_order', e.target.value || undefined)}
        placeholder="Enter work order number"
      />
    </div>
  );

  const essentialFilters = (
    <div className="space-y-4">
      {renderStatusFilter()}
      {renderDateRangeFilter()}
    </div>
  );

  const advancedFilters = (
    <div className="space-y-4">
      {renderPartnerOrganizationFilter()}
      {renderLocationFilter()}
      {renderSubcontractorFilter()}
      {renderTradeFilter()}
      {renderSubmittedByFilter()}
      {renderWorkOrderFilter()}
    </div>
  );

  return (
    <div className="overflow-y-auto space-y-6 py-4">
      <div>
        <h3 className="text-sm font-medium mb-3">Essential Filters</h3>
        {essentialFilters}
      </div>
      
      <Separator />
      
      <div>
        <h3 className="text-sm font-medium mb-3">Advanced Filters</h3>
        {advancedFilters}
      </div>

      {activeFilterCount > 0 && onClear && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClear}
            className="w-full"
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}