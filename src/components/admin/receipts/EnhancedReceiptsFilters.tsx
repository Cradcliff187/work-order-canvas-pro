import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, X, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

export type ReceiptCategory = 'Materials' | 'Equipment' | 'Labor' | 'Other';
export type ReceiptStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface EnhancedReceiptsFiltersValue {
  search?: string;
  dateRange?: DateRange;
  vendor?: string;
  category?: ReceiptCategory;
  status?: ReceiptStatus;
  amount_min?: number;
  amount_max?: number;
  has_attachment?: boolean;
  creator_type?: 'admin' | 'employee';
  allocation_status?: 'full' | 'partial' | 'none';
}

export interface EnhancedReceiptsFiltersProps {
  value?: EnhancedReceiptsFiltersValue;
  onChange?: (next: EnhancedReceiptsFiltersValue) => void;
  onExport?: () => void;
  className?: string;
}

export function EnhancedReceiptsFilters({ value = {}, onChange, onExport, className }: EnhancedReceiptsFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = (patch: Partial<EnhancedReceiptsFiltersValue>) => onChange?.({ ...value, ...patch });
  const clearAll = () => onChange?.({});

  const dateLabel = () => {
    if (!value.dateRange?.from && !value.dateRange?.to) return 'Select date range';
    const start = value.dateRange?.from ? format(value.dateRange.from, 'MMM d, yyyy') : 'Start';
    const end = value.dateRange?.to ? format(value.dateRange.to, 'MMM d, yyyy') : 'End';
    return `${start} → ${end}`;
  };

  const hasActiveFilters = Object.keys(value).some(key => 
    value[key as keyof EnhancedReceiptsFiltersValue] !== undefined
  );

  return (
    <div className={className}>
      <Card className="p-4 space-y-4">
        {/* Quick Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <Input
            placeholder="Search receipts..."
            value={value.search || ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
          />

          {/* Date Range */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <Calendar
                mode="range"
                selected={value.dateRange}
                onSelect={(range) => set({ dateRange: range })}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select
            value={value.status || 'all'}
            onValueChange={(v) => set({ status: v === 'all' ? undefined : (v as ReceiptStatus) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Creator Type */}
          <Select
            value={value.creator_type || 'all'}
            onValueChange={(v) => set({ creator_type: v === 'all' ? undefined : (v as 'admin' | 'employee') })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All creators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Creators</SelectItem>
              <SelectItem value="admin">Admin Created</SelectItem>
              <SelectItem value="employee">Employee Created</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-1" />
              More Filters
            </Button>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
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
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Materials">Materials</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Labor">Labor</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Range</label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={value.amount_min ?? ''}
                  onChange={(e) => set({ amount_min: e.target.value ? Number(e.target.value) : undefined })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={value.amount_max ?? ''}
                  onChange={(e) => set({ amount_max: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Allocation Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Allocation Status</label>
              <Select
                value={value.allocation_status || 'all'}
                onValueChange={(v) => set({ allocation_status: v === 'all' ? undefined : (v as 'full' | 'partial' | 'none') })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All allocations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Allocations</SelectItem>
                  <SelectItem value="full">Fully Allocated</SelectItem>
                  <SelectItem value="partial">Partially Allocated</SelectItem>
                  <SelectItem value="none">Not Allocated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Attachment */}
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="has-attachment"
                checked={!!value.has_attachment}
                onCheckedChange={(checked) => set({ has_attachment: !!checked })}
              />
              <label htmlFor="has-attachment" className="text-sm">
                Has attachment
              </label>
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Active filters applied
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}