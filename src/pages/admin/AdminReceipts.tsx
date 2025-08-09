import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { format } from 'date-fns';

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
          <CardTitle>Results ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Vendor</th>
                  <th className="py-2 px-2">Amount</th>
                  <th className="py-2 px-2">Work Orders</th>
                  <th className="py-2 px-2">Allocation</th>
                  <th className="py-2 px-2">Attachment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const allocated = (r.receipt_work_orders || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
                  const status = allocated === 0 ? 'Unallocated' : (allocated >= r.amount ? 'Full' : 'Partial');
                  return (
                    <tr key={r.id} className="border-b hover:bg-accent/30">
                      <td className="py-2 px-2 whitespace-nowrap">{format(new Date(r.receipt_date), 'MMM d, yyyy')}</td>
                      <td className="py-2 px-2">{r.vendor_name}</td>
                      <td className="py-2 px-2">${r.amount.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        {(r.receipt_work_orders || []).map((a, idx) => (
                          <div key={idx} className="text-xs">
                            {a.work_orders?.work_order_number} {a.work_orders?.title ? `— ${a.work_orders.title}` : ''}
                          </div>
                        ))}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant={status === 'Full' ? 'secondary' : status === 'Partial' ? 'default' : 'outline'}>{status}</Badge>
                      </td>
                      <td className="py-2 px-2">{r.receipt_image_url ? 'Yes' : 'No'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
