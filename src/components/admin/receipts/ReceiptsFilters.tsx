import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';

export type ReceiptCategory = 'Materials' | 'Equipment' | 'Labor' | 'Other';

export interface ReceiptsFiltersValue {
  date_from?: string;
  date_to?: string;
  vendor?: string;
  category?: ReceiptCategory;
  amount_min?: number;
  amount_max?: number;
  has_attachment?: boolean;
  search?: string;
}

export interface ReceiptsFiltersProps {
  value?: ReceiptsFiltersValue;
  onChange?: (next: ReceiptsFiltersValue) => void;
  className?: string;
}

export function ReceiptsFilters({ value = {}, onChange, className }: ReceiptsFiltersProps) {
  const [open, setOpen] = useState(false);
  const { date_from, date_to } = value || {};

  const dateLabel = useMemo(() => {
    if (!date_from && !date_to) return 'Date range';
    const start = date_from ? format(new Date(date_from), 'MMM d, yyyy') : 'Start';
    const end = date_to ? format(new Date(date_to), 'MMM d, yyyy') : 'End';
    return `${start} → ${end}`;
  }, [date_from, date_to]);

  const set = (patch: Partial<ReceiptsFiltersValue>) => onChange?.({ ...value, ...patch });
  const clearDates = () => set({ date_from: undefined, date_to: undefined });
  const clearAll = () => onChange?.({});

  return (
    <div className={clsx('w-full', className)}>
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search receipts..."
              aria-label="Search receipts"
              value={value.search || ''}
              onChange={(e) => set({ search: e.target.value || undefined })}
            />
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
                    className="p-3 pointer-events-auto"
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

          {/* Vendor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vendor</label>
            <Input
              placeholder="Vendor name"
              value={value.vendor || ''}
              onChange={(e) => set({ vendor: e.target.value || undefined })}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={value.category || 'all'}
              onValueChange={(v) => set({ category: v === 'all' ? undefined : (v as ReceiptCategory) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Labor">Labor</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount min</label>
            <Input
              type="number"
              placeholder="0.00"
              value={value.amount_min ?? ''}
              onChange={(e) => set({ amount_min: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount max</label>
            <Input
              type="number"
              placeholder="1000.00"
              value={value.amount_max ?? ''}
              onChange={(e) => set({ amount_max: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          {/* Has Attachment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Has attachment</label>
            <div className="flex items-center gap-2 h-10">
              <Checkbox
                checked={!!value.has_attachment}
                onCheckedChange={(checked) => set({ has_attachment: !!checked })}
                aria-label="Has attachment"
              />
              <span className="text-sm text-muted-foreground">Only show receipts with images</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={clearAll}>Reset</Button>
        </div>
      </Card>
    </div>
  );
}
