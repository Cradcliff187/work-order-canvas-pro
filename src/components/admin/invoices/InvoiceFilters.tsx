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
}

const statusOptions = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'paid', label: 'Paid', color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

export function InvoiceFilters({
  status,
  paymentStatus,
  search,
  onStatusChange,
  onPaymentStatusChange,
  onSearchChange,
  onClearFilters,
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
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <Label htmlFor="search" className="text-sm font-medium">
            Search Invoices
          </Label>
          <Input
            id="search"
            placeholder="Search by internal # or vendor invoice #..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mt-1"
          />
        </div>
        
        <div className="flex-1">
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

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

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