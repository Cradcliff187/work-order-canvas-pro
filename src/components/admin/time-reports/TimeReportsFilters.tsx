import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

export interface TimeReportsFiltersValue {
  date_from?: string;
  date_to?: string;
  employee?: string;
  work_order?: string;
  has_overtime?: boolean;
}

export interface TimeReportsFiltersProps {
  value?: TimeReportsFiltersValue;
  onChange?: (next: TimeReportsFiltersValue) => void;
  className?: string;
}

export function TimeReportsFilters({ value = {}, onChange, className }: TimeReportsFiltersProps) {
  const [open, setOpen] = useState(false);
  const { date_from, date_to } = value || {};
  const dateLabel = useMemo(() => {
    if (!date_from && !date_to) return 'Date range';
    const start = date_from ? format(new Date(date_from), 'MMM d, yyyy') : 'Start';
    const end = date_to ? format(new Date(date_to), 'MMM d, yyyy') : 'End';
    return `${start} → ${end}`;
  }, [date_from, date_to]);

  const set = (patch: Partial<TimeReportsFiltersValue>) => onChange?.({ ...value, ...patch });
  const clearDates = () => set({ date_from: undefined, date_to: undefined });

  return (
    <div className={clsx('w-full', className)}>
      <Card className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Date Range */}
          <div className="space-y-1">
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

          {/* Employee */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Employee</label>
            <Input
              placeholder="Name or email"
              value={value.employee || ''}
              onChange={(e) => set({ employee: e.target.value || undefined })}
              aria-label="Filter by employee"
            />
          </div>

          {/* Work Order */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Work Order</label>
            <Input
              placeholder="WO number or title"
              value={value.work_order || ''}
              onChange={(e) => set({ work_order: e.target.value || undefined })}
              aria-label="Filter by work order"
            />
          </div>

          {/* Has Overtime */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Has overtime</label>
            <div className="flex items-center gap-2 h-10">
              <Checkbox
                checked={!!value.has_overtime}
                onCheckedChange={(c) => set({ has_overtime: Boolean(c) })}
                aria-label="Filter entries with overtime"
              />
              <span className="text-sm text-muted-foreground">Only entries with overtime</span>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block" />
        </div>
      </Card>
    </div>
  );
}
