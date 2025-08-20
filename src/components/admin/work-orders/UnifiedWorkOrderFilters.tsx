import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';


import { Input } from '@/components/ui/input';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllAssignees } from '@/hooks/useEmployeesForAssignment';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';

export interface WorkOrderFiltersValue {
  status?: string[];
  priority?: string[];
  partner_organization_ids?: string[];
  completed_by?: string[];
  trade_id?: string[];
  location_filter?: string[];
  date_range?: { from?: string; to?: string };
}

interface UnifiedWorkOrderFiltersProps {
  filters: WorkOrderFiltersValue;
  onFiltersChange: (filters: WorkOrderFiltersValue) => void;
  onClear: () => void;
  filterCount: number;
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

const priorityOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'urgent', label: 'Urgent' },
];

export function UnifiedWorkOrderFilters({
  filters,
  onFiltersChange,
  onClear,
  filterCount
}: UnifiedWorkOrderFiltersProps) {
  // Data fetching hooks
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

  // Debug logging
  console.log('🔍 UnifiedWorkOrderFilters - Data:', {
    organizations: organizations?.length || 0,
    trades: trades?.length || 0,
    subcontractors: subcontractors?.length || 0,
    assignees: assignees?.length || 0,
    locations: locations?.length || 0,
    filters
  });

  // Local states
  const [locationTextInput, setLocationTextInput] = useState('');
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // filterCount is now passed as prop from parent component

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

  // Debug prepared options
  console.log('🔍 UnifiedWorkOrderFilters - Prepared Options:', {
    statusOptions: statusOptions.length,
    priorityOptions: priorityOptions.length,
    organizationOptions: organizationOptions.length,
    tradeOptions: tradeOptions.length,
    completedByOptions: completedByOptions.length
  });

  const locationOptions = useMemo(() => {
    const allLocations = (locations || []).map(loc => loc.location_name).filter(Boolean);
    const uniqueLocations = Array.from(new Set(allLocations));
    return uniqueLocations.map(loc => ({ value: loc, label: loc }));
  }, [locations]);

  // Handle filter changes
  const handleArrayFilterChange = (key: keyof WorkOrderFiltersValue, value: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value.length > 0 ? value : undefined
    });
  };


  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      date_range: {
        from: date ? format(date, 'yyyy-MM-dd') : undefined,
        to: filters.date_range?.to
      }
    });
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      date_range: {
        from: filters.date_range?.from,
        to: date ? format(date, 'yyyy-MM-dd') : undefined
      }
    });
    setDateToOpen(false);
  };

  const handleLocationTextSubmit = () => {
    if (locationTextInput.trim()) {
      const current = filters.location_filter || [];
      if (!current.includes(locationTextInput.trim())) {
        handleArrayFilterChange('location_filter', [...current, locationTextInput.trim()]);
      }
      setLocationTextInput('');
    }
  };

  const clearDateRange = () => {
    onFiltersChange({
      ...filters,
      date_range: undefined
    });
  };



  // Essential filters (always visible in sections)
  const essentialFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.status?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('status', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select status</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.priority?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('priority', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select priority</option>
          {priorityOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.partner_organization_ids?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('partner_organization_ids', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select organization</option>
          {organizationOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </>
  );

  // Advanced filters (collapsible in sections)
  const advancedFilters = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Completed By</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.completed_by?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('completed_by', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select assignee type</option>
          {completedByOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Trade</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.trade_id?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('trade_id', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select trade</option>
          {tradeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <select 
          className="w-full p-2 border rounded-md bg-background"
          value={filters.location_filter?.[0] || ''}
          onChange={(e) => handleArrayFilterChange('location_filter', e.target.value ? [e.target.value] : [])}
        >
          <option value="">Select location</option>
          {locationOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
                {filters.date_range?.from ? format(new Date(filters.date_range.from), 'PPP') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date_range?.from ? new Date(filters.date_range.from) : undefined}
                onSelect={handleDateFromChange}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date_range?.to ? format(new Date(filters.date_range.to), 'PPP') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date_range?.to ? new Date(filters.date_range.to) : undefined}
                onSelect={handleDateToChange}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        {(filters.date_range?.from || filters.date_range?.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateRange}
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
    <div className="space-y-4">
      {/* Essential Filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Essential</h3>
        {essentialFilters}
      </div>
      
      {/* Advanced Filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Advanced</h3>
        {advancedFilters}
      </div>
    </div>
  );
}

export default UnifiedWorkOrderFilters;