import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Plus, 
  DollarSign,
  Clock,
  TrendingUp,
  ReceiptText,
  Building2,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing Dashboard</h1>
        <p className="text-muted-foreground">Monitor billing activities and manage invoices</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-warning">{metrics?.unbilledReports.count || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-3 w-20" />
              ) : (
                `${formatCurrency(metrics?.unbilledReports.totalValue || 0)} total value`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partner Invoices</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-primary">{metrics?.monthlyTotals.partnerInvoices || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subcontractor Invoices</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-primary">{metrics?.monthlyTotals.subcontractorInvoices || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-success">
                {formatCurrency(metrics?.monthlyTotals.totalValue || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">All invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/invoices')}
        >
          <Plus className="h-5 w-5" />
          Enter Subcontractor Invoice
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/partner-billing/select-reports')}
        >
          <Building2 className="h-5 w-5" />
          Generate Partner Invoices
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/invoices')}
        >
          <FileText className="h-5 w-5" />
          View All Invoices
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/reports?status=approved&billing_status=unbilled')}
        >
          <Clock className="h-5 w-5" />
          View Unbilled Reports
        </Button>
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
    </div>
  );
}