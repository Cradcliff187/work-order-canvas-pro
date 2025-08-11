import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { format } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';

interface ReceiptRow {
  id: string;
  employee_user_id: string;
  vendor_name: string;
  amount: number;
  description?: string;
  receipt_date: string;
  receipt_image_url?: string;
  created_at: string;
  receipt_work_orders: { allocated_amount: number; work_orders?: { id: string; work_order_number: string; title: string } }[];
}

const orgTypeOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'partner', label: 'Partner' },
  { value: 'subcontractor', label: 'Subcontractor' },
];

const allocationOptions = [
  { value: 'unallocated', label: 'Unallocated' },
  { value: 'partial', label: 'Partial' },
  { value: 'full', label: 'Full' },
];

export default function AdminReceipts() {
  // Filters state
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [organizationType, setOrganizationType] = useState<string[]>([]);
  const [allocationStatus, setAllocationStatus] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [hasAttachment, setHasAttachment] = useState<string>('all');
  const [sort, setSort] = useState<{ key: 'date' | 'vendor' | 'amount' | 'allocation' | 'attachment'; desc: boolean }>({ key: 'date', desc: true });

  // Column visibility for results table
  const columnMetadata = {
    date: { label: 'Date', defaultVisible: true },
    vendor: { label: 'Vendor', defaultVisible: true },
    amount: { label: 'Amount', defaultVisible: true },
    work_orders: { label: 'Work Orders', defaultVisible: true },
    allocation: { label: 'Allocation', defaultVisible: true },
    attachment: { label: 'Attachment', defaultVisible: true },
  } as const;

  const { columnVisibility, toggleColumn, resetToDefaults, getAllColumns, getVisibleColumnCount } = useColumnVisibility({
    storageKey: 'admin-receipts-columns-v1',
    columnMetadata: columnMetadata as any,
  });

  const columnOptions = getAllColumns().map((c) => ({ ...c, canHide: true }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin-receipts-filters-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSearch(parsed.search ?? '');
        setOrganizationId(parsed.organizationId ?? undefined);
        setOrganizationType(parsed.organizationType ?? []);
        setAllocationStatus(parsed.allocationStatus ?? []);
        setDateFrom(parsed.dateFrom ?? '');
        setDateTo(parsed.dateTo ?? '');
        setAmountMin(parsed.amountMin ?? '');
        setAmountMax(parsed.amountMax ?? '');
        setHasAttachment(parsed.hasAttachment ?? 'all');
        setSort(parsed.sort ?? { key: 'date', desc: true });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const snapshot = {
      search,
      organizationId,
      organizationType,
      allocationStatus,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      hasAttachment,
      sort,
    };
    try { localStorage.setItem('admin-receipts-filters-v1', JSON.stringify(snapshot)); } catch {}
  }, [search, organizationId, organizationType, allocationStatus, dateFrom, dateTo, amountMin, amountMax, hasAttachment, sort]);


  const receiptsQuery = useQuery({
    queryKey: ['admin-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          id, employee_user_id, vendor_name, amount, description, receipt_date, receipt_image_url, created_at,
          receipt_work_orders(
            allocated_amount,
            work_orders(id, work_order_number, title)
          )
        `)
        .order('receipt_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as ReceiptRow[];
    },
  });

  // Load uploader memberships to compute org filters
  const membershipsQuery = useQuery({
    queryKey: ['admin-receipts-memberships', receiptsQuery.data?.map(r => r.employee_user_id).join(',')],
    enabled: !!receiptsQuery.data?.length,
    queryFn: async () => {
      const ids = Array.from(new Set((receiptsQuery.data || []).map(r => r.employee_user_id)));
      if (ids.length === 0) return [] as any[];
      const { data, error } = await supabase
        .from('organization_members')
        .select(`user_id, organization_id, organizations(id, name, organization_type)`) 
        .in('user_id', ids);
      if (error) throw error;
      return data || [];
    }
  });

  const membershipByUser = useMemo(() => {
    const map = new Map<string, { organization_id: string; organization_type: string }[]>();
    (membershipsQuery.data || []).forEach((m: any) => {
      const list = map.get(m.user_id) || [];
      if (m.organizations) {
        list.push({ organization_id: m.organizations.id, organization_type: m.organizations.organization_type });
      }
      map.set(m.user_id, list);
    });
    return map;
  }, [membershipsQuery.data]);

  const filtered = useMemo(() => {
    const list = receiptsQuery.data || [];
    return list.filter((r) => {
      const hay = `${r.vendor_name} ${r.description || ''} ${r.receipt_work_orders.map(a => a.work_orders?.work_order_number || '').join(' ')}`.toLowerCase();
      const q = search.toLowerCase().trim();
      const matchesSearch = q ? hay.includes(q) : true;
      const d = r.receipt_date ? r.receipt_date.slice(0,10) : '';
      const matchesDate = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      const matchesAmount = (!amountMin || r.amount >= Number(amountMin)) && (!amountMax || r.amount <= Number(amountMax));
      const matchesAttachment = hasAttachment === 'all' ? true : (hasAttachment === 'with' ? !!r.receipt_image_url : !r.receipt_image_url);
      // Allocation status
      const allocated = (r.receipt_work_orders || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
      const status = allocated === 0 ? 'unallocated' : (allocated >= r.amount ? 'full' : 'partial');
      const matchesAllocation = allocationStatus.length ? allocationStatus.includes(status) : true;
      // Org filters from uploader memberships
      const userMemberships = membershipByUser.get(r.employee_user_id) || [];
      const matchesOrgId = organizationId ? userMemberships.some(m => m.organization_id === organizationId) : true;
      const matchesOrgType = organizationType.length ? userMemberships.some(m => organizationType.includes(m.organization_type)) : true;
      return matchesSearch && matchesDate && matchesAmount && matchesAttachment && matchesAllocation && matchesOrgId && matchesOrgType;
    });
  }, [receiptsQuery.data, search, dateFrom, dateTo, amountMin, amountMax, hasAttachment, allocationStatus, organizationId, organizationType, membershipByUser]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'date': {
          const cmp = (a.receipt_date || '').localeCompare(b.receipt_date || '');
          return sort.desc ? -cmp : cmp;
        }
        case 'vendor': {
          const cmp = (a.vendor_name || '').toLowerCase().localeCompare((b.vendor_name || '').toLowerCase());
          return sort.desc ? -cmp : cmp;
        }
        case 'amount': {
          const cmp = (a.amount || 0) - (b.amount || 0);
          return sort.desc ? -cmp : cmp;
        }
        case 'attachment': {
          const av = a.receipt_image_url ? 1 : 0;
          const bv = b.receipt_image_url ? 1 : 0;
          const cmp = av - bv;
          return sort.desc ? -cmp : cmp;
        }
        case 'allocation': {
          const aAlloc = (a.receipt_work_orders || []).reduce((s, x) => s + (x.allocated_amount || 0), 0);
          const bAlloc = (b.receipt_work_orders || []).reduce((s, x) => s + (x.allocated_amount || 0), 0);
          const aScore = aAlloc === 0 ? 0 : (aAlloc >= (a.amount || 0) ? 2 : 1);
          const bScore = bAlloc === 0 ? 0 : (bAlloc >= (b.amount || 0) ? 2 : 1);
          const cmp = aScore - bScore;
          return sort.desc ? -cmp : cmp;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sort]);

  const clearFilters = () => {
    setSearch('');
    setOrganizationId(undefined);
    setOrganizationType([]);
    setAllocationStatus([]);
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setHasAttachment('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Receipts</h1>
        <div className="flex items-center gap-2">
          {(search || organizationId || organizationType.length || allocationStatus.length || dateFrom || dateTo || amountMin || amountMax || hasAttachment !== 'all') && (
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">Search</label>
            <Input placeholder="Search vendor, description, WO#" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Organization</label>
            <OrganizationSelector value={organizationId} onChange={setOrganizationId} placeholder="All organizations" className="mt-1 w-full" />
          </div>
          <div>
            <label className="text-sm font-medium">Org Type</label>
            <MultiSelectFilter options={orgTypeOptions} selectedValues={organizationType} onSelectionChange={setOrganizationType} placeholder="All org types" />
          </div>
          <div>
            <label className="text-sm font-medium">Allocation</label>
            <MultiSelectFilter options={allocationOptions} selectedValues={allocationStatus} onSelectionChange={setAllocationStatus} placeholder="All statuses" />
          </div>
          <div>
            <label className="text-sm font-medium">Date From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Date To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Min Amount</label>
            <Input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Max Amount</label>
            <Input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Attachments</label>
            <select value={hasAttachment} onChange={(e) => setHasAttachment(e.target.value)} className="mt-1 w-full h-10 border rounded-md bg-background">
              <option value="all">All</option>
              <option value="with">With attachment</option>
              <option value="without">Without attachment</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Results ({sorted.length})</CardTitle>
              <div role="region" aria-label="Results toolbar" className="flex items-center gap-2">
                <div className="hidden md:block text-sm text-muted-foreground">{sorted.length} receipts</div>
                <ColumnVisibilityDropdown
                  columns={columnOptions}
                  onToggleColumn={toggleColumn}
                  onResetToDefaults={resetToDefaults}
                  variant="outline"
                  size="sm"
                  visibleCount={columnOptions.filter(c => c.canHide && c.visible).length}
                  totalCount={columnOptions.filter(c => c.canHide).length}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {receiptsQuery.isError ? (
              <EmptyState
                title="Couldn't load receipts"
                description="We couldn't load receipts. Please try again."
                action={{ label: 'Retry', onClick: () => receiptsQuery.refetch?.() }}
              />
            ) : receiptsQuery.isLoading ? (
              <EnhancedTableSkeleton rows={5} columns={Math.max((getVisibleColumnCount?.() || 6), 5)} />
            ) : sorted.length === 0 ? (
              <EmptyState
                title="No receipts found"
                description={(search || organizationId || organizationType.length || allocationStatus.length || dateFrom || dateTo || amountMin || amountMax || hasAttachment !== 'all') ? 'Try adjusting your filters or search.' : 'Receipts will appear here when employees upload them.'}
              />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <ResponsiveTableWrapper stickyFirstColumn>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          {columnVisibility.date !== false && (
                            <th className="py-2 px-2">
                              <button
                                className="flex items-center gap-1"
                                onClick={() => setSort((s) => ({ key: 'date', desc: s.key === 'date' ? !s.desc : false }))}
                                aria-label={`Sort by date ${sort.key === 'date' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                              >
                                <span>Date</span>
                                {sort.key === 'date' ? (
                                  sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </th>
                          )}
                          {columnVisibility.vendor !== false && (
                            <th className="py-2 px-2">
                              <button
                                className="flex items-center gap-1"
                                onClick={() => setSort((s) => ({ key: 'vendor', desc: s.key === 'vendor' ? !s.desc : false }))}
                                aria-label={`Sort by vendor ${sort.key === 'vendor' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                              >
                                <span>Vendor</span>
                                {sort.key === 'vendor' ? (
                                  sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </th>
                          )}
                          {columnVisibility.amount !== false && (
                            <th className="py-2 px-2">
                              <button
                                className="flex items-center gap-1"
                                onClick={() => setSort((s) => ({ key: 'amount', desc: s.key === 'amount' ? !s.desc : false }))}
                                aria-label={`Sort by amount ${sort.key === 'amount' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                              >
                                <span>Amount</span>
                                {sort.key === 'amount' ? (
                                  sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </th>
                          )}
                          {columnVisibility.work_orders !== false && <th className="py-2 px-2">Work Orders</th>}
                          {columnVisibility.allocation !== false && (
                            <th className="py-2 px-2">
                              <button
                                className="flex items-center gap-1"
                                onClick={() => setSort((s) => ({ key: 'allocation', desc: s.key === 'allocation' ? !s.desc : false }))}
                                aria-label={`Sort by allocation ${sort.key === 'allocation' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                              >
                                <span>Allocation</span>
                                {sort.key === 'allocation' ? (
                                  sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </th>
                          )}
                          {columnVisibility.attachment !== false && (
                            <th className="py-2 px-2">
                              <button
                                className="flex items-center gap-1"
                                onClick={() => setSort((s) => ({ key: 'attachment', desc: s.key === 'attachment' ? !s.desc : false }))}
                                aria-label={`Sort by attachment ${sort.key === 'attachment' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                              >
                                <span>Attachment</span>
                                {sort.key === 'attachment' ? (
                                  sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => {
                          const allocated = (r.receipt_work_orders || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
                          const status = allocated === 0 ? 'Unallocated' : (allocated >= r.amount ? 'Full' : 'Partial');
                          return (
                            <tr key={r.id} className="border-b hover:bg-accent/30">
                              {columnVisibility.date !== false && (
                                <td className="py-2 px-2 whitespace-nowrap">{format(new Date(r.receipt_date), 'MMM d, yyyy')}</td>
                              )}
                              {columnVisibility.vendor !== false && <td className="py-2 px-2">{r.vendor_name}</td>}
                              {columnVisibility.amount !== false && <td className="py-2 px-2">${'{'}r.amount.toFixed(2){'}'}</td>}
                              {columnVisibility.work_orders !== false && (
                                <td className="py-2 px-2">
                                  {(r.receipt_work_orders || []).map((a, idx) => (
                                    <div key={idx} className="text-xs">
                                      {a.work_orders?.work_order_number} {a.work_orders?.title ? `— ${'{'}a.work_orders.title{'}'}` : ''}
                                    </div>
                                  ))}
                                </td>
                              )}
                              {columnVisibility.allocation !== false && (
                                <td className="py-2 px-2">
                                  <Badge variant={status === 'Full' ? 'secondary' : status === 'Partial' ? 'default' : 'outline'}>{status}</Badge>
                                </td>
                              )}
                              {columnVisibility.attachment !== false && <td className="py-2 px-2">{r.receipt_image_url ? 'Yes' : 'No'}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ResponsiveTableWrapper>
                </div>

                {/* Mobile Cards */}
                <div className="block lg:hidden space-y-3">
                  {sorted.map((r) => {
                    const allocated = (r.receipt_work_orders || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
                    const status = allocated === 0 ? 'Unallocated' : (allocated >= r.amount ? 'Full' : 'Partial');
                    return (
                      <MobileTableCard
                        key={r.id}
                        title={r.vendor_name}
                        subtitle={r.receipt_date ? format(new Date(r.receipt_date), 'MMM d, yyyy') : ''}
                      >
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">${'{'}r.amount.toFixed(2){'}'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <Badge variant={status === 'Full' ? 'secondary' : status === 'Partial' ? 'default' : 'outline'} className="h-5 text-[10px] px-1.5">{status}</Badge>
                          <span className="text-muted-foreground">{(r.receipt_work_orders || [])[0]?.work_orders?.work_order_number || ''}</span>
                        </div>
                      </MobileTableCard>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
