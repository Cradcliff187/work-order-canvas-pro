import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import PipelineDashboard from '@/pages/admin/PipelineDashboard';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { Invoice } from '@/hooks/useInvoices';

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
    work_order_numbers: string[];
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

  // Fetch recent subcontractor invoices with work order numbers
  const { data: subcontractorInvoices, error: subError } = await supabase
    .from('invoices')
    .select(`
      id,
      internal_invoice_number,
      total_amount,
      submitted_at,
      status,
      subcontractor_organization:organizations!subcontractor_organization_id(name),
      invoice_work_orders(
        work_orders(work_order_number)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (subError) throw subError;

  // Transform subcontractor invoices to include work order numbers
  const transformedSubcontractorInvoices = subcontractorInvoices?.map(invoice => ({
    ...invoice,
    work_order_numbers: invoice.invoice_work_orders?.map(
      (iwo: any) => iwo.work_orders?.work_order_number
    ).filter(Boolean) || []
  })) || [];

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
    recentSubcontractorInvoices: transformedSubcontractorInvoices,
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
    staleTime: 60 * 1000, // Cache for 1 minute to reduce churn
  });
}

export default function BillingDashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading, error, refetch } = useBillingMetrics();
  
  // Modal state for invoice details
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<string | undefined>(undefined);
  const [amountMin, setAmountMin] = React.useState<number | undefined>(undefined);
  const [amountMax, setAmountMax] = React.useState<number | undefined>(undefined);
  const [transactionTypes, setTransactionTypes] = React.useState<string[]>([]);

  // Column visibility for Transactions table
  const { columnVisibility, toggleColumn, resetToDefaults, getVisibleColumnCount, getAllColumns } = useColumnVisibility({
    storageKey: 'admin-billing-transactions-columns-v1',
    legacyKeys: ['billing_transactions_columns'],
    columnMetadata: {
      date: { label: 'Date', defaultVisible: true },
      type: { label: 'Type', defaultVisible: true },
      amount: { label: 'Amount', defaultVisible: true },
      reference: { label: 'Reference', defaultVisible: true },
      organization_name: { label: 'Organization', defaultVisible: true },
    },
  });

  const columnOptions = getAllColumns();
  const visibleTransactionColumns = columnOptions.filter(c => c.visible).map(c => c.id as keyof TransactionRow);

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

  // Export handlers for Transactions
  const transactionExportColumns: ExportColumn[] = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'type', label: 'Type', type: 'string' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'reference', label: 'Reference', type: 'string' },
    { key: 'organization_name', label: 'Organization', type: 'string' },
  ];

  const handleExport = (format: 'csv' | 'excel') => {
    const filename = generateFilename('billing_transactions', format === 'excel' ? 'xlsx' : 'csv');
    if (format === 'excel') {
      exportToExcel(filteredTransactions, transactionExportColumns, filename);
    } else {
      exportToCSV(filteredTransactions, transactionExportColumns, filename);
    }
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handler for opening invoice modal
  const handleInvoiceClick = async (invoiceId: string) => {
    try {
      // Fetch the full invoice data
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subcontractor_organization:organizations!subcontractor_organization_id(*),
          submitted_by_user:profiles!submitted_by(id, first_name, last_name),
          approved_by_user:profiles!approved_by(id, first_name, last_name),
          invoice_work_orders(
            id,
            work_order_id,
            amount,
            description,
            work_order:work_orders(
              id,
              work_order_number,
              title
            )
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      
      setSelectedInvoice(invoice);
      setInvoiceModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  React.useEffect(() => {
    const title = 'Billing Dashboard | AKC Portal';
    document.title = title;
    const description = 'Admin billing dashboard: KPIs, recent invoices, and transactions.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description.slice(0, 160));

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, []);

if (error) {
  return (
    <EmptyState
      icon={FileText}
      title="We couldn't load billing data"
      description="Please check your connection and try again."
      action={{ label: 'Retry', onClick: () => refetch() }}
      variant="full"
    />
  );
}

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-background text-foreground px-3 py-2 rounded-md"
      >
        Skip to main content
      </a>
      <main id="main-content" role="main" tabIndex={-1} className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold mb-2">Billing Dashboard</h1>
          <p className="text-muted-foreground">Monitor billing activities and manage invoices</p>
        </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="min-w-max px-0 overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div role="region" aria-label="Quick actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Button
              onClick={() => navigate('/admin/invoices')}
              aria-label="Enter Subcontractor Invoice"
            >
              <Plus className="h-4 w-4 mr-2" />
              Enter Subcontractor Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/partner-billing/select-reports')}
              aria-label="Generate Partner Invoices"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Generate Partner Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/invoices')}
              aria-label="View All Invoices"
            >
              <FileText className="h-4 w-4 mr-2" />
              View All Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/reports?status=approved&billing_status=unbilled')}
              aria-label="View Unbilled Reports"
            >
              <Clock className="h-4 w-4 mr-2" />
              View Unbilled Reports
            </Button>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Partner Invoices */}
            <Card role="region" aria-label="Recent Partner Invoices">
              <CardHeader>
                <CardTitle>Recent Partner Invoices</CardTitle>
                <CardDescription>Latest partner invoices generated</CardDescription>
              </CardHeader>
              <CardContent aria-busy={isLoading}>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.recentPartnerInvoices && metrics.recentPartnerInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.recentPartnerInvoices.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                        className="w-full flex justify-between items-center rounded-md px-2 py-2 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
                        aria-label={`View partner invoice ${invoice.invoice_number} for ${invoice.partner_organization.name} dated ${format(new Date(invoice.invoice_date), 'MMM d, yyyy')}`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.partner_organization.name} • {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(invoice.total_amount)}</p>
                          <FinancialStatusBadge status={invoice.status} size="sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="No recent partner invoices"
                    description="Generate partner invoices from approved reports."
                    action={{ label: 'Generate Partner Invoices', onClick: () => navigate('/admin/partner-billing/select-reports') }}
                    variant="card"
                  />
                )}
              </CardContent>
            </Card>

            {/* Recent Subcontractor Invoices */}
            <Card role="region" aria-label="Recent Subcontractor Invoices">
              <CardHeader>
                <CardTitle>Recent Subcontractor Invoices</CardTitle>
                <CardDescription>Latest subcontractor invoices processed</CardDescription>
              </CardHeader>
              <CardContent aria-busy={isLoading}>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.recentSubcontractorInvoices && metrics.recentSubcontractorInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.recentSubcontractorInvoices.map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        onClick={() => handleInvoiceClick(invoice.id)}
                        className="w-full flex justify-between items-center rounded-md px-2 py-2 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
                        aria-label={`View subcontractor invoice ${invoice.internal_invoice_number} for ${invoice.subcontractor_organization?.name || 'Unknown'} dated ${format(new Date(invoice.submitted_at), 'MMM d, yyyy')}`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{invoice.internal_invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.subcontractor_organization?.name || 'Unknown'} • {format(new Date(invoice.submitted_at), 'MMM d, yyyy')}
                          </p>
                          {invoice.work_order_numbers.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              WO: {invoice.work_order_numbers.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(invoice.total_amount || 0)}</p>
                          <FinancialStatusBadge status={invoice.status} size="sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ReceiptText}
                    title="No recent subcontractor invoices"
                    description="Enter a subcontractor invoice to see it here."
                    action={{ label: 'Enter Invoice', onClick: () => navigate('/admin/invoices') }}
                    variant="card"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <PipelineDashboard />
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </main>
  </>
  );
}
