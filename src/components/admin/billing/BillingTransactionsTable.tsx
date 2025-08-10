import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

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
}

export function BillingTransactionsTable({ rows }: BillingTransactionsTableProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                {([
                  { key: 'date', label: 'Date' },
                  { key: 'type', label: 'Type' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'reference', label: 'Reference' },
                  { key: 'organization_name', label: 'Organization' },
                ] as Array<{ key: keyof TransactionRow; label: string }>).map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <th key={key as string} className="py-2 px-2">
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
                  <td className="py-2 px-2 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-2 px-2 capitalize">{r.type.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-2">${r.amount.toFixed(2)}</td>
                  <td className="py-2 px-2">{r.reference || '-'}</td>
                  <td className="py-2 px-2">{r.organization_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
