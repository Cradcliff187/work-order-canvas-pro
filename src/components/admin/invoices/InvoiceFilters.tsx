import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface InvoiceFiltersProps {
  status: string[];
  paymentStatus?: 'paid' | 'unpaid';
  search: string;
  onStatusChange: (status: string[]) => void;
  onPaymentStatusChange: (paymentStatus?: 'paid' | 'unpaid') => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  // Optional advanced filters (backward-compatible)
  partnerId?: string;
  partnerOptions?: { value: string; label: string }[];
  onPartnerChange?: (partnerId?: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (from?: string, to?: string) => void;
  amountMin?: number;
  amountMax?: number;
  onAmountRangeChange?: (min?: number, max?: number) => void;
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border' },
  // Keep legacy statuses for compatibility
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function InvoiceFilters({
  status,
  paymentStatus,
  search,
  onStatusChange,
  onPaymentStatusChange,
  onSearchChange,
  onClearFilters,
  partnerId,
  partnerOptions,
  onPartnerChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  amountMin,
  amountMax,
  onAmountRangeChange,
}: InvoiceFiltersProps) {
  const toggleStatus = (statusValue: string) => {
    if (status.includes(statusValue)) {
      onStatusChange(status.filter(s => s !== statusValue));
    } else {
      onStatusChange([...status, statusValue]);
    }
  };

  const hasActiveFilters = status.length > 0 || paymentStatus || search;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-4 md:items-end">
        <div className="md:col-span-2">
          <Label htmlFor="search" className="text-sm font-medium">
            Search Invoices
          </Label>
          <Input
            id="search"
            placeholder="Search by invoice # or vendor invoice #..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Payment Status</Label>
          <Select value={paymentStatus || 'all'} onValueChange={(value) => 
            onPaymentStatusChange(value === 'all' ? undefined : value as 'paid' | 'unpaid')
          }>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All payment statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {onPartnerChange && (
          <div>
            <Label className="text-sm font-medium">Partner</Label>
            <Select value={partnerId || 'all'} onValueChange={(value) => onPartnerChange(value === 'all' ? undefined : value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All partners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All partners</SelectItem>
                {partnerOptions?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="shrink-0 md:col-span-1"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {(onDateRangeChange || onAmountRangeChange) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {onDateRangeChange && (
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dateFrom || ''}
                  onChange={(e) => onDateRangeChange?.(e.target.value || undefined, dateTo)}
                />
                <Input
                  type="date"
                  value={dateTo || ''}
                  onChange={(e) => onDateRangeChange?.(dateFrom, e.target.value || undefined)}
                />
              </div>
            </div>
          )}
          {onAmountRangeChange && (
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Amount Range</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={amountMin ?? ''}
                  onChange={(e) => onAmountRangeChange?.(e.target.value ? Number(e.target.value) : undefined, amountMax)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={amountMax ?? ''}
                  onChange={(e) => onAmountRangeChange?.(amountMin, e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="text-sm font-medium">Invoice Status</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const isSelected = status.includes(option.value);
            return (
              <Badge
                key={option.value}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? option.color
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
                onClick={() => toggleStatus(option.value)}
              >
                {option.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}