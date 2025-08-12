import { useMemo, useState } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceFiltersValue {
  status?: string[];
  paymentStatus?: 'paid' | 'unpaid';
  search?: string;
  organization_id?: string; // partner organization (from work order)
  trade_id?: string[];
  location_filter?: string[];
  date_from?: string;
  date_to?: string;
  overdue?: boolean; // due_date < today AND unpaid
  created_today?: boolean; // created today
}

interface InvoiceFiltersProps {
  value: InvoiceFiltersValue;
  onChange: (next: InvoiceFiltersValue) => void;
  onClear?: () => void;
  filterCount?: number;
}

const statusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function InvoiceFilters({ value, onChange, onClear, filterCount = 0 }: InvoiceFiltersProps) {
  const { data: organizations } = useOrganizationsForWorkOrders();
  const { data: trades } = useTrades();

  const set = (patch: Partial<InvoiceFiltersValue>) => onChange({ ...value, ...patch });

  // Locations sourced from work orders, optionally filtered by partner org
  const { data: locations } = useQuery({
    queryKey: ['invoice-locations', value.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select('store_location')
        .not('store_location', 'is', null)
        .not('store_location', 'eq', '');
      if (value.organization_id) {
        query = query.eq('organization_id', value.organization_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      const uniqueLocations = [...new Set((data || []).map((w) => w.store_location).filter(Boolean) as string[])].sort();
      return uniqueLocations;
    },
  });

  const [dateFrom, setDateFrom] = useState<Date | undefined>(value.date_from ? new Date(value.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(value.date_to ? new Date(value.date_to) : undefined);

  return (
    <AdminFilterBar title="Filters" filterCount={filterCount} onClear={onClear}>
      {/* Search */}
      <SmartSearchInput
        value={value.search || ''}
        onChange={(e) => set({ search: e.target.value })}
        onSearchSubmit={(q) => set({ search: q })}
        placeholder="Search invoices..."
        className="w-full"
        storageKey="admin-invoices-search"
      />

      {/* Status */}
      <MultiSelectFilter
        options={statusOptions}
        selectedValues={value.status || []}
        onSelectionChange={(values) => set({ status: values.length ? values : undefined })}
        placeholder="Status"
      />

      {/* Payment Status */}
      <Select
        value={value.paymentStatus ?? 'any'}
        onValueChange={(val) => set({ paymentStatus: val === 'any' ? undefined : (val as 'paid' | 'unpaid') })}
      >
        <SelectTrigger aria-label="Payment status">
          <SelectValue placeholder="Payment status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </SelectContent>
      </Select>

      {/* Partner Organization */}
      <Select
        value={value.organization_id || 'all-organizations'}
        onValueChange={(val) => set({ organization_id: val === 'all-organizations' ? undefined : val, location_filter: undefined })}
      >
        <SelectTrigger aria-label="Partner organization">
          <SelectValue placeholder="Partner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-organizations">All Partners</SelectItem>
          {Array.isArray(organizations) && organizations.map((org) => (
            <SelectItem key={org.id} value={org.id || `org-${org.name}`}>{org.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location */}
      <MultiSelectFilter
        options={(locations || []).map((loc) => ({ value: loc, label: loc }))}
        selectedValues={value.location_filter || []}
        onSelectionChange={(values) => set({ location_filter: values.length ? values : undefined })}
        placeholder="Location"
      />

      {/* Trade */}
      <MultiSelectFilter
        options={(Array.isArray(trades) ? trades : []).map((t) => ({ value: t.id || `trade-${t.name}`, label: t.name }))}
        selectedValues={value.trade_id || []}
        onSelectionChange={(values) => set({ trade_id: values.length ? values : undefined })}
        placeholder="Trade"
      />

      {/* Date Range (created at) */}
      <div className="grid grid-cols-2 gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn('justify-start text-left font-normal h-10', !dateFrom && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'MMM dd') : 'From'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(d) => {
                setDateFrom(d || undefined);
                set({ date_from: d ? format(d, 'yyyy-MM-dd') : undefined });
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn('justify-start text-left font-normal h-10', !dateTo && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'MMM dd') : 'To'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(d) => {
                setDateTo(d || undefined);
                set({ date_to: d ? format(d, 'yyyy-MM-dd') : undefined });
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick toggles */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={value.overdue ? 'secondary' : 'outline'} size="sm" onClick={() => set({ overdue: !value.overdue })}>
          Overdue
        </Button>
        <Button variant={value.created_today ? 'secondary' : 'outline'} size="sm" onClick={() => set({ created_today: !value.created_today })}>
          Today
        </Button>
      </div>
    </AdminFilterBar>
  );
}

export default InvoiceFilters;
