import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Plus, 
  DollarSign,
  Clock,
  ReceiptText,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { BillingTransactionFilters } from '@/components/admin/billing/BillingTransactionFilters';
import { BillingTransactionsTable } from '@/components/admin/billing/BillingTransactionsTable';
import { KPICard } from '@/components/analytics/KPICard';
import { QuickActionTile } from '@/components/admin/billing/QuickActionTile';

interface DashboardMetrics {
  unbilledReports: {
    count: number;
    totalValue: number;
  };
  recentPartnerInvoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    partner_organization: { name: string };
    status: string;
  }>;
  recentSubcontractorInvoices: Array<{
    id: string;
    internal_invoice_number: string;
    total_amount: number;
    submitted_at: string;
    status: string;
    subcontractor_organization: { name: string };
  }>;
  monthlyTotals: {
    partnerInvoices: number;
    subcontractorInvoices: number;
    totalValue: number;
  };
}

async function fetchBillingMetrics(): Promise<DashboardMetrics> {
  // Fetch unbilled approved reports
  const { data: unbilledReports, error: reportsError } = await supabase
    .from('work_order_reports')
    .select('id, partner_billed_amount')
    .eq('status', 'approved')
    .is('partner_invoice_id', null);

  if (reportsError) throw reportsError;

  // Fetch recent partner invoices
  const { data: partnerInvoices, error: partnerError } = await supabase
    .from('partner_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_amount,
      status,
      partner_organization:organizations!partner_organization_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (partnerError) throw partnerError;

  // Fetch recent subcontractor invoices
  const { data: subcontractorInvoices, error: subError } = await supabase
    .from('invoices')
    .select(`
      id,
      internal_invoice_number,
      total_amount,
      submitted_at,
      status,
      subcontractor_organization:organizations!subcontractor_organization_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (subError) throw subError;

  // Calculate monthly totals
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyPartner } = await supabase
    .from('partner_invoices')
    .select('total_amount')
    .gte('created_at', startOfMonth.toISOString());

  const { data: monthlySub } = await supabase
    .from('invoices')
    .select('total_amount')
    .gte('created_at', startOfMonth.toISOString());

  const unbilledCount = unbilledReports?.length || 0;
  const unbilledValue = unbilledReports?.reduce((sum, report) => sum + (report.partner_billed_amount || 0), 0) || 0;

  return {
    unbilledReports: {
      count: unbilledCount,
      totalValue: unbilledValue
    },
    recentPartnerInvoices: partnerInvoices || [],
    recentSubcontractorInvoices: subcontractorInvoices || [],
    monthlyTotals: {
      partnerInvoices: monthlyPartner?.length || 0,
      subcontractorInvoices: monthlySub?.length || 0,
      totalValue: (monthlyPartner?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0) + 
                  (monthlySub?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0)
    }
  };
}

function useBillingMetrics() {
  return useQuery({
    queryKey: ['billing-metrics'],
    queryFn: fetchBillingMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export default function BillingDashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading, error } = useBillingMetrics();

  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<string | undefined>(undefined);
  const [amountMin, setAmountMin] = React.useState<number | undefined>(undefined);
  const [amountMax, setAmountMax] = React.useState<number | undefined>(undefined);
  const [transactionTypes, setTransactionTypes] = React.useState<string[]>([]);

  type TransactionRow = {
    id: string;
    date: string;
    amount: number;
    type: string;
    reference?: string;
    organization_name?: string;
  };

  const allTransactions = React.useMemo<TransactionRow[]>(() => {
    const rows: TransactionRow[] = [];
    if (metrics) {
      metrics.recentPartnerInvoices?.forEach((inv) => {
        rows.push({
          id: `partner-${inv.id}`,
          date: inv.invoice_date,
          amount: inv.total_amount,
          type: 'invoice_payment',
          reference: inv.invoice_number,
          organization_name: inv.partner_organization?.name,
        });
      });
      metrics.recentSubcontractorInvoices?.forEach((inv) => {
        rows.push({
          id: `sub-${inv.id}`,
          date: inv.submitted_at,
          amount: inv.total_amount || 0,
          type: 'invoice_payment',
          reference: inv.internal_invoice_number,
          organization_name: inv.subcontractor_organization?.name,
        });
      });
    }
    return rows;
  }, [metrics]);

  const filteredTransactions = React.useMemo(() => {
    let rows = allTransactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.reference || '').toLowerCase().includes(q) || (r.organization_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((r) => new Date(r.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      rows = rows.filter((r) => new Date(r.date) <= to);
    }
    if (amountMin !== undefined) rows = rows.filter((r) => r.amount >= amountMin);
    if (amountMax !== undefined) rows = rows.filter((r) => r.amount <= amountMax);
    if (transactionTypes.length) rows = rows.filter((r) => transactionTypes.includes(r.type));
    return rows;
  }, [allTransactions, search, dateFrom, dateTo, amountMin, amountMax, transactionTypes]);

  const handleDateRangeChange = (from?: string, to?: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleAmountRangeChange = (min?: number, max?: number) => {
    setAmountMin(min);
    setAmountMax(max);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Billing Dashboard</h1>
          <p className="text-muted-foreground">Please try refreshing the page or check your connection.</p>
        </div>
      </div>
    );
  }

  return (
    <main id="main-content" role="main" className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-2">Billing Dashboard</h1>
        <p className="text-muted-foreground">Monitor billing activities and manage invoices</p>
      </header>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 no-scrollbar">
          <TabsList className="min-w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
            <KPICard
              title="Unbilled Reports"
              value={isLoading ? 0 : (metrics?.unbilledReports.count || 0)}
              icon={Clock}
              isLoading={isLoading}
            />
            <KPICard
              title="Partner Invoices"
              value={isLoading ? 0 : (metrics?.monthlyTotals.partnerInvoices || 0)}
              icon={Building2}
              isLoading={isLoading}
            />
            <KPICard
              title="Subcontractor Invoices"
              value={isLoading ? 0 : (metrics?.monthlyTotals.subcontractorInvoices || 0)}
              icon={ReceiptText}
              isLoading={isLoading}
            />
            <KPICard
              title="Monthly Total"
              value={isLoading ? 0 : (metrics?.monthlyTotals.totalValue || 0)}
              format="currency"
              icon={DollarSign}
              isLoading={isLoading}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <QuickActionTile 
              label="Enter Subcontractor Invoice"
              icon={Plus}
              onClick={() => navigate('/admin/invoices')}
            />
            <QuickActionTile 
              label="Generate Partner Invoices"
              icon={Building2}
              onClick={() => navigate('/admin/partner-billing/select-reports')}
            />
            <QuickActionTile 
              label="View All Invoices"
              icon={FileText}
              onClick={() => navigate('/admin/invoices')}
            />
            <QuickActionTile 
              label="View Unbilled Reports"
              icon={Clock}
              onClick={() => navigate('/admin/reports?status=approved&billing_status=unbilled')}
            />
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Partner Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Partner Invoices</CardTitle>
                <CardDescription>Latest partner invoices generated</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.recentPartnerInvoices && metrics.recentPartnerInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.recentPartnerInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.partner_organization.name} • {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(invoice.total_amount)}</p>
                          <FinancialStatusBadge status={invoice.status} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No recent partner invoices
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Subcontractor Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Subcontractor Invoices</CardTitle>
                <CardDescription>Latest subcontractor invoices processed</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.recentSubcontractorInvoices && metrics.recentSubcontractorInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.recentSubcontractorInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{invoice.internal_invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.subcontractor_organization?.name || 'Unknown'} • {format(new Date(invoice.submitted_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(invoice.total_amount || 0)}</p>
                          <FinancialStatusBadge status={invoice.status} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No recent subcontractor invoices
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="space-y-4">
            <BillingTransactionFilters
              search={search}
              onSearchChange={setSearch}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateRangeChange={handleDateRangeChange}
              amountMin={amountMin}
              amountMax={amountMax}
              onAmountRangeChange={handleAmountRangeChange}
              transactionTypes={transactionTypes}
              onTransactionTypesChange={setTransactionTypes}
            />

            <BillingTransactionsTable rows={filteredTransactions} />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}