import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';

interface TransactionRow {
  id: string;
  date: string;
  amount: number;
  type: string;
  reference?: string;
  organization_name?: string;
}

interface BillingTransactionsTableProps {
  rows: TransactionRow[];
  visibleColumns?: Array<keyof TransactionRow>;
}

export function BillingTransactionsTable({ rows, visibleColumns }: BillingTransactionsTableProps) {
  const [sortKey, setSortKey] = React.useState<keyof TransactionRow>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const handleSort = (key: keyof TransactionRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRows = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: any = a[sortKey as keyof TransactionRow];
      let bv: any = b[sortKey as keyof TransactionRow];

      if (sortKey === 'date') {
        av = new Date(av as string).getTime();
        bv = new Date(bv as string).getTime();
      }
      if (sortKey === 'amount') {
        av = Number(av);
        bv = Number(bv);
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const allColumns: Array<{ key: keyof TransactionRow; label: string }> = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'reference', label: 'Reference' },
    { key: 'organization_name', label: 'Organization' },
  ];

  const displayedColumns = React.useMemo(
    () => (visibleColumns && visibleColumns.length
      ? allColumns.filter(c => (visibleColumns as Array<string>).includes(c.key as string))
      : allColumns),
    [visibleColumns]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile list */}
        <div className="md:hidden space-y-3">
          {sortedRows.map((r) => (
            <MobileTableCard
              key={r.id}
              title={(r.reference || r.type.replace(/_/g, ' ')).toString()}
              subtitle={`${r.organization_name || '-' } • ${new Date(r.date).toLocaleDateString()}`}
              status={<span className="text-sm font-semibold">{formatCurrency(r.amount)}</span>}
            />
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <ResponsiveTableWrapper stickyFirstColumn minWidth="720px">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  {displayedColumns.map(({ key, label }) => {
                    const active = sortKey === key;
                    const ariaSort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
                    return (
                      <th key={key as string} className="py-2 px-2" aria-sort={ariaSort}>
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="inline-flex items-center gap-1 text-left"
                          aria-label={`Sort by ${label}${active ? ` (${sortDir})` : ''}`}
                        >
                          <span>{label}</span>
                          {active ? (
                            <SortIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-b">
                    {displayedColumns.map(({ key }) => (
                      <td key={key as string} className="py-2 px-2 whitespace-nowrap">
                        {key === 'date' && new Date(r.date).toLocaleDateString()}
                        {key === 'type' && <span className="capitalize">{r.type.replace(/_/g, ' ')}</span>}
                        {key === 'amount' && formatCurrency(r.amount)}
                        {key === 'reference' && (r.reference || '-')}
                        {key === 'organization_name' && (r.organization_name || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableWrapper>
        </div>
      </CardContent>
    </Card>
  );
}
