import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';

export interface PartnerInvoiceFiltersValue {
  status?: string[];
  partner_organization_id?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
}

export interface CompactPartnerInvoiceFiltersProps {
  value: PartnerInvoiceFiltersValue;
  onChange: (value: PartnerInvoiceFiltersValue) => void;
  onClear?: () => void;
}

const invoiceStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const CompactPartnerInvoiceFilters: React.FC<CompactPartnerInvoiceFiltersProps> = ({
  value,
  onChange,
  onClear
}) => {
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  const { data: organizations } = useOrganizations();

  // Calculate active filter count
  const activeCount = useMemo(() => {
    return [
      value.status?.length,
      value.partner_organization_id?.length,
      value.date_from,
      value.date_to,
      value.amount_min,
      value.amount_max
    ].filter(Boolean).length;
  }, [value]);

  // Prepare partner organization options
  const partnerOptions = useMemo(() => {
    return organizations?.filter(org => org.organization_type === 'partner')
      .map(org => ({
        value: org.id,
        label: org.name
      })) || [];
  }, [organizations]);

  // Handle filter changes
  const handleFilterChange = (key: keyof PartnerInvoiceFiltersValue, filterValue: string[]) => {
    onChange({
      ...value,
      [key]: filterValue
    });
  };

  const handleStringFilterChange = (key: keyof PartnerInvoiceFiltersValue, filterValue: string) => {
    onChange({
      ...value,
      [key]: filterValue || undefined
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onChange({
      ...value,
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined
    });
    setShowDateFrom(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onChange({
      ...value,
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined
    });
    setShowDateTo(false);
  };

  return (
    <AdminFilterBar
      title="Invoice Filters"
      filterCount={activeCount}
      onClear={onClear}
      sections={{
        essential: (
          <>
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <MultiSelectFilter
                options={invoiceStatusOptions}
                selectedValues={value.status || []}
                onSelectionChange={(filterValue) => handleFilterChange('status', filterValue)}
                placeholder="Filter by status..."
                className="w-full h-10"
              />
            </div>

            {/* Partner Organization Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Partner Organization</label>
              <MultiSelectFilter
                options={partnerOptions}
                selectedValues={value.partner_organization_id || []}
                onSelectionChange={(filterValue) => handleFilterChange('partner_organization_id', filterValue)}
                placeholder="Filter by partner..."
                className="w-full h-10"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !value.date_from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value.date_from ? format(new Date(value.date_from), "PP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={value.date_from ? new Date(value.date_from) : undefined}
                      onSelect={handleDateFromChange}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>

                <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !value.date_to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value.date_to ? format(new Date(value.date_to), "PP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={value.date_to ? new Date(value.date_to) : undefined}
                      onSelect={handleDateToChange}
                      initialFocus
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Amount Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={value.amount_min || ''}
                  onChange={(e) => handleStringFilterChange('amount_min', e.target.value)}
                  className="h-10"
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={value.amount_max || ''}
                  onChange={(e) => handleStringFilterChange('amount_max', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </>
        )
      }}
    />
  );
};

// Hook for counting active filters
export function usePartnerInvoiceFilterCount(filters: PartnerInvoiceFiltersValue) {
  return useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.partner_organization_id?.length) count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.amount_min || filters.amount_max) count++;
    return count;
  }, [filters]);
}