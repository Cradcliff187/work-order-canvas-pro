import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Amount</th>
                <th className="py-2 px-2">Reference</th>
                <th className="py-2 px-2">Organization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 px-2 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-2 px-2">{r.type}</td>
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
