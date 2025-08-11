import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';

interface BillingTransactionFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (from?: string, to?: string) => void;
  amountMin?: number;
  amountMax?: number;
  onAmountRangeChange?: (min?: number, max?: number) => void;
  transactionTypes: string[];
  onTransactionTypesChange: (types: string[]) => void;
  organizationId?: string;
  onOrganizationChange?: (id?: string) => void;
}

const typeOptions = [
  { value: 'invoice_payment', label: 'Invoice Payment' },
  // Future: { value: 'adjustment', label: 'Adjustment' },
  // Future: { value: 'credit', label: 'Credit' },
];

export function BillingTransactionFilters({
  search,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  amountMin,
  amountMax,
  onAmountRangeChange,
  transactionTypes,
  onTransactionTypesChange,
  organizationId,
  onOrganizationChange,
}: BillingTransactionFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
      <div className="sm:col-span-2 lg:col-span-2">
        <Label className="text-sm font-medium">Search</Label>
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search reference or org" className="mt-1" />
      </div>
      <div>
        <Label className="text-sm font-medium">Date From</Label>
        <Input type="date" value={dateFrom || ''} onChange={(e) => onDateRangeChange?.(e.target.value || undefined, dateTo)} className="mt-1" />
      </div>
      <div>
        <Label className="text-sm font-medium">Date To</Label>
        <Input type="date" value={dateTo || ''} onChange={(e) => onDateRangeChange?.(dateFrom, e.target.value || undefined)} className="mt-1" />
      </div>
      <div>
        <Label className="text-sm font-medium">Amount Min</Label>
        <Input type="number" value={amountMin ?? ''} onChange={(e) => onAmountRangeChange?.(e.target.value ? Number(e.target.value) : undefined, amountMax)} className="mt-1" />
      </div>
      <div>
        <Label className="text-sm font-medium">Amount Max</Label>
        <Input type="number" value={amountMax ?? ''} onChange={(e) => onAmountRangeChange?.(amountMin, e.target.value ? Number(e.target.value) : undefined)} className="mt-1" />
      </div>
      <div className="sm:col-span-2 lg:col-span-2">
        <Label className="text-sm font-medium">Type</Label>
        <MultiSelectFilter options={typeOptions} selectedValues={transactionTypes} onSelectionChange={onTransactionTypesChange} placeholder="All types" />
      </div>
      {onOrganizationChange && (
        <div className="sm:col-span-2 lg:col-span-2">
          <Label className="text-sm font-medium">Organization</Label>
          <OrganizationSelector value={organizationId} onChange={onOrganizationChange} placeholder="All organizations" className="mt-1 w-full" />
        </div>
      )}
    </div>
  );
}
