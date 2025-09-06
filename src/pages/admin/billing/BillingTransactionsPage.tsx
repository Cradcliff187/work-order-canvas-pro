import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { BillingTransactionsTable } from '@/components/admin/billing/BillingTransactionsTable';
import { StandardDashboardStats } from '@/components/dashboard/StandardDashboardStats';
import { StatCard } from '@/components/dashboard/StandardDashboardStats';

// Mock data for example - replace with actual data hook
const mockTransactions = [
  {
    id: '1',
    date: '2024-01-15',
    amount: 2500,
    type: 'invoice_payment',
    reference: 'INV-2024-001',
    organization_name: 'ABC Construction'
  },
  {
    id: '2',
    date: '2024-01-14',
    amount: 1200,
    type: 'expense_reimbursement',
    reference: 'EXP-2024-005',
    organization_name: 'DEF Contractors'
  }
];

export default function BillingTransactionsPage() {
  const isLoading = false; // Replace with actual loading state

  const stats = useMemo(() => {
    if (!mockTransactions?.length) return [];
    
    const totalTransactions = mockTransactions.length;
    const totalAmount = mockTransactions.reduce((sum, t) => sum + t.amount, 0);
    const thisMonth = mockTransactions.filter(t => 
      new Date(t.date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    ).length;

    const statsCards: StatCard[] = [
      {
        icon: DollarSign,
        label: 'Total Volume',
        value: `$${totalAmount.toLocaleString()}`,
        variant: 'default'
      },
      {
        icon: Activity,
        label: 'Total Transactions',
        value: totalTransactions.toString(),
        variant: 'default'
      },
      {
        icon: TrendingUp,
        label: 'This Month',
        value: thisMonth.toString(),
        variant: 'default'
      }
    ];

    return statsCards;
  }, [mockTransactions]);

  const handleExport = () => {
    // Handle export logic
    console.log('Exporting transactions...');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Billing Transactions</h1>
          <p className="text-muted-foreground">
            Monitor all financial transactions and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <StandardDashboardStats stats={stats} loading={isLoading} />

      <BillingTransactionsTable 
        rows={mockTransactions}
        isLoading={isLoading}
      />
    </div>
  );
}