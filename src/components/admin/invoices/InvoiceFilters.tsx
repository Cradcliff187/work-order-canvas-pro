import { useState, useEffect } from 'react';
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useTrades } from '@/hooks/useWorkOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceFiltersValue {
  status?: string[];
  paymentStatus?: 'paid' | 'unpaid';
  search?: string;
  partner_organization_id?: string; // partner organization (via work orders)
  subcontractor_organization_id?: string; // subcontractor organization (direct)
  trade_id?: string[];
  location_filter?: string[];
  date_from?: string;
  date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  amount_min?: number;
  amount_max?: number;
  has_attachments?: boolean;
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
  const { data: trades } = useTrades();

  const set = (patch: Partial<InvoiceFiltersValue>) => onChange({ ...value, ...patch });

  // Locations sourced from work orders, optionally filtered by partner organization
  const { data: locations } = useQuery({
    queryKey: ['invoice-locations', value.partner_organization_id],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select('store_location')
        .not('store_location', 'is', null)
        .not('store_location', 'eq', '');
      if (value.partner_organization_id) {
        query = query.eq('organization_id', value.partner_organization_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      const uniqueLocations = [...new Set((data || []).map((w) => w.store_location).filter(Boolean) as string[])].sort();
      return uniqueLocations;
    },
  });

  const [dateFrom, setDateFrom] = useState<Date | undefined>(value.date_from ? new Date(value.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(value.date_to ? new Date(value.date_to) : undefined);
  const [dueDateFrom, setDueDateFrom] = useState<Date | undefined>(value.due_date_from ? new Date(value.due_date_from) : undefined);
  const [dueDateTo, setDueDateTo] = useState<Date | undefined>(value.due_date_to ? new Date(value.due_date_to) : undefined);

  // Sync local date state with filter values when filters are cleared
  useEffect(() => {
    setDateFrom(value.date_from ? new Date(value.date_from) : undefined);
  }, [value.date_from]);

  useEffect(() => {
    setDateTo(value.date_to ? new Date(value.date_to) : undefined);
  }, [value.date_to]);

  useEffect(() => {
    setDueDateFrom(value.due_date_from ? new Date(value.due_date_from) : undefined);
  }, [value.due_date_from]);

  useEffect(() => {
    setDueDateTo(value.due_date_to ? new Date(value.due_date_to) : undefined);
  }, [value.due_date_to]);

  return (
    <AdminFilterBar title="Filters" filterCount={filterCount} onClear={onClear} collapsible={true}>
      {/* Search - Full width on mobile, grid on desktop */}
      <div className="col-span-full lg:col-span-1">
        <SmartSearchInput
          value={value.search || ''}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search invoices..."
          storageKey="admin-invoices-search"
        />
      </div>

      {/* Status - MultiSelectFilter */}
      <MultiSelectFilter
        options={statusOptions}
        selectedValues={value.status || []}
        onSelectionChange={(values) => set({ status: values.length ? values : undefined })}
        placeholder="All Statuses"
      />

      {/* Payment Status - Single Select */}
      <Select
        value={value.paymentStatus || 'all'}
        onValueChange={(val) => set({ paymentStatus: val === 'all' ? undefined : val as 'paid' | 'unpaid' })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Payment Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </SelectContent>
      </Select>

      {/* Partner Organization Filter (via work orders) */}
      <OrganizationSelector
        value={value.partner_organization_id}
        onChange={(id) => set({ partner_organization_id: id, location_filter: undefined })}
        organizationType="partner"
        placeholder="All Partners"
      />

      {/* Subcontractor Organization Filter (direct) */}
      <OrganizationSelector
        value={value.subcontractor_organization_id}
        onChange={(id) => set({ subcontractor_organization_id: id })}
        organizationType="subcontractor"
        placeholder="All Subcontractors"
      />

      {/* Location Filter */}
      <MultiSelectFilter
        options={(locations || []).map((loc) => ({ value: loc, label: loc }))}
        selectedValues={value.location_filter || []}
        onSelectionChange={(values) => set({ location_filter: values.length ? values : undefined })}
        placeholder="All Locations"
      />

      {/* Trade Filter */}
      <MultiSelectFilter
        options={(Array.isArray(trades) ? trades : []).map((t) => ({ value: t.id || `trade-${t.name}`, label: t.name }))}
        selectedValues={value.trade_id || []}
        onSelectionChange={(values) => set({ trade_id: values.length ? values : undefined })}
        placeholder="All Trades"
      />

      {/* Date Range - Start */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={(date) => {
              setDateFrom(date || undefined);
              set({ date_from: date ? format(date, 'yyyy-MM-dd') : undefined });
            }}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Date Range - End */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={dateTo}
            onSelect={(date) => {
              setDateTo(date || undefined);
              set({ date_to: date ? format(date, 'yyyy-MM-dd') : undefined });
            }}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Due Date Range - Start */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dueDateFrom ? format(dueDateFrom, 'MMM d, yyyy') : 'Due From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={dueDateFrom}
            onSelect={(date) => {
              setDueDateFrom(date || undefined);
              set({ due_date_from: date ? format(date, 'yyyy-MM-dd') : undefined });
            }}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Due Date Range - End */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dueDateTo ? format(dueDateTo, 'MMM d, yyyy') : 'Due To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={dueDateTo}
            onSelect={(date) => {
              setDueDateTo(date || undefined);
              set({ due_date_to: date ? format(date, 'yyyy-MM-dd') : undefined });
            }}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Amount Min */}
      <Input
        type="number"
        placeholder="Min Amount"
        value={value.amount_min || ''}
        onChange={(e) => set({ amount_min: e.target.value ? Number(e.target.value) : undefined })}
      />

      {/* Amount Max */}
      <Input
        type="number"
        placeholder="Max Amount"
        value={value.amount_max || ''}
        onChange={(e) => set({ amount_max: e.target.value ? Number(e.target.value) : undefined })}
      />

      {/* Quick Filters Section - Full width */}
      <div className="col-span-full flex gap-2 flex-wrap">
        <Button
          variant={value.overdue ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => set({ overdue: !value.overdue })}
        >
          Overdue
        </Button>
        <Button
          variant={value.created_today ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => set({ created_today: !value.created_today })}
        >
          Created Today
        </Button>
        <Button
          variant={value.has_attachments ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => set({ has_attachments: !value.has_attachments })}
        >
          Has Attachments
        </Button>
      </div>
    </AdminFilterBar>
  );
}

export default InvoiceFilters;
