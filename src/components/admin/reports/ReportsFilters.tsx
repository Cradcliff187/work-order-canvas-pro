// DEPRECATED: This component has been replaced by ReportsFiltersV2.tsx
// TODO: Delete this file after confirming all references have been migrated
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReportsFiltersValue {
  status?: string[];
  date_from?: string;
  date_to?: string;
  submitted_by?: string; // free text or email
  work_order?: string; // work order number or title
  location?: string; // single location selection
}

export interface ReportsFiltersProps {
  value: ReportsFiltersValue;
  onChange: (next: ReportsFiltersValue) => void;
}

export function ReportsFilters({ value, onChange }: ReportsFiltersProps) {
  const [open, setOpen] = useState(false);
  const { date_from, date_to } = value || {};
  
  // Fetch unique store_location values from work_orders that have reports
  const { data: locations = [] } = useQuery({
    queryKey: ['report-locations'],
    queryFn: async () => {
      // First get all work_order_ids from reports
      const { data: reports } = await supabase
        .from('work_order_reports')
        .select('work_order_id');
      
      if (!reports || reports.length === 0) return [];
      
      const workOrderIds = [...new Set(reports.map(r => r.work_order_id))];
      
      // Then get unique store_locations from those work orders
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('store_location')
        .in('id', workOrderIds)
        .not('store_location', 'is', null)
        .not('store_location', 'eq', '');
      
      if (!workOrders) return [];
      
      const uniqueLocations = [...new Set(workOrders.map(wo => wo.store_location))].filter(Boolean);
      return uniqueLocations.sort();
    }
  });
  
  const dateLabel = useMemo(() => {
    if (!date_from && !date_to) return 'Date range';
    const start = date_from ? format(new Date(date_from), 'MMM d, yyyy') : 'Start';
    const end = date_to ? format(new Date(date_to), 'MMM d, yyyy') : 'End';
    return `${start} → ${end}`;
  }, [date_from, date_to]);

  const set = (patch: Partial<ReportsFiltersValue>) => onChange({ ...value, ...patch });

  const clearDates = () => set({ date_from: undefined, date_to: undefined });

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={value.status?.[0] || 'all'}
            onValueChange={(v) => set({ status: v === 'all' ? undefined : [v] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date range</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex items-start gap-2">
                <Calendar
                  mode="range"
                  selected={{ from: value.date_from ? new Date(value.date_from) : undefined, to: value.date_to ? new Date(value.date_to) : undefined } as any}
                  onSelect={(range: any) => {
                    set({
                      date_from: range?.from ? new Date(range.from).toISOString() : undefined,
                      date_to: range?.to ? new Date(range.to).toISOString() : undefined,
                    });
                  }}
                  numberOfMonths={2}
                />
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="ghost" onClick={clearDates}>
                    <X className="h-4 w-4 mr-2" /> Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Submitted By */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Submitted By</label>
          <Input
            placeholder="Name or email"
            value={value.submitted_by || ''}
            onChange={(e) => set({ submitted_by: e.target.value || undefined })}
          />
        </div>

        {/* Work Order */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Work Order</label>
          <Input
            placeholder="WO number or title"
            value={value.work_order || ''}
            onChange={(e) => set({ work_order: e.target.value || undefined })}
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Select
            value={value.location || 'all'}
            onValueChange={(v) => set({ location: v === 'all' ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

export default ReportsFilters;
