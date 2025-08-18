import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Input } from '@/components/ui/input';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllAssignees } from '@/hooks/useEmployeesForAssignment';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';

interface WorkOrderFiltersV2Props {
  filters: {
    status?: string[];
    trade_id?: string[];
    partner_organization_ids?: string[];
    completed_by?: string[];
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

export function WorkOrderFiltersV2({ 
  filters, 
  searchTerm, 
  onFiltersChange, 
  onSearchChange, 
  onClearFilters 
}: WorkOrderFiltersV2Props) {
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
  const { employees: assignees } = useAllAssignees();
  const { data: locations } = usePartnerLocations();

  const [locationTextInput, setLocationTextInput] = useState('');

  // Date picker states
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    const baseCount = Object.values(filters).filter(value => 
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    ).length + (searchTerm ? 1 : 0);
    return baseCount;
  }, [filters, searchTerm]);

  // Prepare option arrays
  const organizationOptions = organizations?.map(org => ({
    value: org.id,
    label: org.name
  })) || [];

  const tradeOptions = trades?.map(trade => ({
    value: trade.id,
    label: trade.name
  })) || [];

  const completedByOptions = [
    { value: 'internal', label: 'Internal' },
    ...(subcontractors?.map(sub => ({
      value: sub.id,
      label: sub.name
    })) || [])
  ];

  const locationOptions = useMemo(() => {
    const allLocations = (locations || []).map(loc => loc.location_name).filter(Boolean);
    const uniqueLocations = Array.from(new Set(allLocations));
    return uniqueLocations.map(loc => ({ value: loc, label: loc }));
  }, [locations]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined
    });
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined
    });
    setDateToOpen(false);
  };

  const handleLocationTextSubmit = () => {
    if (locationTextInput.trim()) {
      const current = filters.location_filter || [];
      if (!current.includes(locationTextInput.trim())) {
        handleFilterChange('location_filter', [...current, locationTextInput.trim()]);
      }
      setLocationTextInput('');
    }
  };

  // Search slot component
  const searchSlot = (
    <SmartSearchInput
      placeholder="Search work orders, locations, or descriptions..."
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      onSearchSubmit={onSearchChange}
      storageKey="admin-work-orders-search"
      aria-label="Search work orders"
      className="w-full"
    />
  );

  // Essential filters (always visible in sections)
  const essentialFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <MultiSelectFilter
          placeholder="Select status"
          options={statusOptions}
          selectedValues={filters.status || []}
          onSelectionChange={(values) => handleFilterChange('status', values)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <MultiSelectFilter
          placeholder="Select organization"
          options={organizationOptions}
          selectedValues={filters.partner_organization_ids || []}
          onSelectionChange={(values) => handleFilterChange('partner_organization_ids', values)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Completed By</label>
        <MultiSelectFilter
          placeholder="Select assignee type"
          options={completedByOptions}
          selectedValues={filters.completed_by || []}
          onSelectionChange={(values) => handleFilterChange('completed_by', values)}
        />
      </div>
    </>
  );

  // Advanced filters (collapsible in sections)
  const advancedFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Trade</label>
        <MultiSelectFilter
          placeholder="Select trade"
          options={tradeOptions}
          selectedValues={filters.trade_id || []}
          onSelectionChange={(values) => handleFilterChange('trade_id', values)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <MultiSelectFilter
          placeholder="Select location"
          options={locationOptions}
          selectedValues={filters.location_filter || []}
          onSelectionChange={(values) => handleFilterChange('location_filter', values)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Add custom location"
            value={locationTextInput}
            onChange={(e) => setLocationTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLocationTextSubmit();
              }
            }}
            className="flex-1"
          />
          <Button 
            onClick={handleLocationTextSubmit}
            size="sm" 
            variant="outline"
            disabled={!locationTextInput.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Date Range</label>
        <div className="flex gap-2">
          <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date_from ? format(new Date(filters.date_from), 'PPP') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date_from ? new Date(filters.date_from) : undefined}
                onSelect={handleDateFromChange}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date_to ? format(new Date(filters.date_to), 'PPP') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date_to ? new Date(filters.date_to) : undefined}
                onSelect={handleDateToChange}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {(filters.date_from || filters.date_to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({
              ...filters,
              date_from: undefined,
              date_to: undefined
            })}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Date Range
          </Button>
        )}
      </div>
    </>
  );

  return (
    <AdminFilterBar
      title="Filters"
      filterCount={activeFilterCount}
      onClear={onClearFilters}
      searchSlot={searchSlot}
      sheetSide="bottom"
      collapsible={true}
      sections={{
        essential: essentialFilters,
        advanced: advancedFilters
      }}
    />
  );
}

export default WorkOrderFiltersV2;