import React, { useMemo, useState } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { useOrganizations } from '@/hooks/useOrganizations';

export interface InvoiceFiltersValue {
  search?: string;
  status?: string[];
  payment_status?: string[];
  amount_range?: {
    min?: number;
    max?: number;
  };
  organization_id?: string;
}

interface UnifiedInvoiceFiltersProps {
  filters: InvoiceFiltersValue;
  onFiltersChange: (filters: InvoiceFiltersValue) => void;
  onClear: () => void;
}

const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' }
];

export function UnifiedInvoiceFilters({
  filters,
  onFiltersChange,
  onClear
}: UnifiedInvoiceFiltersProps) {
  const { data: organizations = [] } = useOrganizations();
  const [minAmount, setMinAmount] = useState(filters.amount_range?.min?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(filters.amount_range?.max?.toString() || '');

  // Calculate filter count
  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.payment_status && filters.payment_status.length > 0) count++;
    if (filters.amount_range?.min || filters.amount_range?.max) count++;
    if (filters.organization_id) count++;
    return count;
  }, [filters]);

  // Filter change handlers
  const handleArrayFilterChange = (key: keyof InvoiceFiltersValue, values: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: values.length > 0 ? values : undefined
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    onFiltersChange({
      ...filters,
      search: search || undefined
    });
  };

  const handleOrganizationChange = (organizationId: string | undefined) => {
    onFiltersChange({
      ...filters,
      organization_id: organizationId
    });
  };

  const handleAmountRangeUpdate = (min: string, max: string) => {
    const minValue = min ? parseFloat(min) : undefined;
    const maxValue = max ? parseFloat(max) : undefined;
    
    if (minValue || maxValue) {
      onFiltersChange({
        ...filters,
        amount_range: {
          min: minValue,
          max: maxValue
        }
      });
    } else {
      onFiltersChange({
        ...filters,
        amount_range: undefined
      });
    }
  };

  const handleMinAmountChange = (value: string) => {
    setMinAmount(value);
    handleAmountRangeUpdate(value, maxAmount);
  };

  const handleMaxAmountChange = (value: string) => {
    setMaxAmount(value);
    handleAmountRangeUpdate(minAmount, value);
  };

  const clearAmountRange = () => {
    setMinAmount('');
    setMaxAmount('');
    onFiltersChange({
      ...filters,
      amount_range: undefined
    });
  };

  // Search slot
  const searchSlot = (
    <SmartSearchInput
      value={filters.search || ''}
      onChange={handleSearchChange}
      placeholder="Search invoices..."
      storageKey="admin-invoices-search"
      className="flex-1"
    />
  );

  // Essential filters
  const essentialFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Invoice Status</label>
        <MultiSelectFilter
          options={INVOICE_STATUSES}
          selectedValues={filters.status || []}
          onSelectionChange={(values) => handleArrayFilterChange('status', values)}
          placeholder="All statuses"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Status</label>
        <MultiSelectFilter
          options={PAYMENT_STATUSES}
          selectedValues={filters.payment_status || []}
          onSelectionChange={(values) => handleArrayFilterChange('payment_status', values)}
          placeholder="All payment statuses"
        />
      </div>
    </div>
  );

  // Advanced filters
  const advancedFilters = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount Range</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => handleMinAmountChange(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => handleMaxAmountChange(e.target.value)}
            className="flex-1"
          />
        </div>
        
        {(filters.amount_range?.min || filters.amount_range?.max) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAmountRange}
            className="w-full"
          >
            Clear amount range
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <OrganizationSelector
          value={filters.organization_id}
          onChange={handleOrganizationChange}
          placeholder="All organizations"
          className="w-full"
        />
      </div>
    </div>
  );

  return (
    <AdminFilterBar
      title="Invoice Filters"
      filterCount={filterCount}
      onClear={onClear}
      searchSlot={searchSlot}
      sections={{
        essential: essentialFilters,
        advanced: advancedFilters
      }}
    />
  );
}