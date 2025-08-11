import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/utils/formatting';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { format } from 'date-fns';
import { exportToCSV, ExportColumn } from '@/lib/utils/export';
import { toast } from 'sonner';

interface PartnerInvoiceDetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  markup_percentage: number;
  total_amount: number;
  status: string;
  partner_organization: {
    name: string;
    contact_email: string;
  };
  line_items: Array<{
    id: string;
    amount: number;
    description: string;
    work_order_report: {
      work_order: {
        work_order_number: string;
        title: string;
      };
    };
  }>;
}

async function fetchPartnerInvoiceDetail(invoiceId: string): Promise<PartnerInvoiceDetail> {
  const { data, error } = await supabase
    .from('partner_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      subtotal,
      markup_percentage,
      total_amount,
      status,
      partner_organization:organizations!partner_organization_id(name, contact_email),
      line_items:partner_invoice_line_items(
        id,
        amount,
        description,
        work_order_report:work_order_reports!work_order_report_id(
          work_order:work_orders!work_order_id(
            work_order_number,
            title
          )
        )
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    throw new Error('Failed to fetch partner invoice details');
  }

  return data as PartnerInvoiceDetail;
}

function usePartnerInvoiceDetail(invoiceId: string) {
  return useQuery({
    queryKey: ['partner-invoice-detail', invoiceId],
    queryFn: () => fetchPartnerInvoiceDetail(invoiceId),
    enabled: !!invoiceId,
  });
}

export default function PartnerInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, error } = usePartnerInvoiceDetail(id!);


  const handleExportCSV = () => {
    try {
      if (!invoice) return;

      // Prepare data for QuickBooks import format
      const csvData = invoice.line_items.map(item => ({
        customer: invoice.partner_organization.name,
        invoice_number: invoice.invoice_number,
        invoice_date: format(new Date(invoice.invoice_date), 'MM/dd/yyyy'),
        work_order_number: item.work_order_report.work_order.work_order_number,
        description: item.description || item.work_order_report.work_order.title,
        amount: item.amount
      }));

      const columns: ExportColumn[] = [
        { key: 'customer', label: 'Customer', type: 'string' },
        { key: 'invoice_number', label: 'Invoice Number', type: 'string' },
        { key: 'invoice_date', label: 'Invoice Date', type: 'string' },
        { key: 'work_order_number', label: 'Work Order #', type: 'string' },
        { key: 'description', label: 'Description', type: 'string' },
        { key: 'amount', label: 'Amount', type: 'currency' }
      ];

      const filename = `partner_invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      
      exportToCSV(csvData, columns, filename);
      toast.success('Invoice exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export invoice');
    }
  };

  if (isLoading) {
    return (
      <main id="main-content" role="main" className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-7 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main id="main-content" role="main" className="space-y-6">
        <EmptyState
          title="Invoice Not Found"
          description="The requested partner invoice could not be found."
          action={{ label: 'Back to Billing', onClick: () => navigate('/admin/partner-billing/select-reports') }}
        />
      </main>
    );
  }

  const markupAmount = invoice.subtotal * (invoice.markup_percentage / 100);

  return (
    <main id="main-content" role="main" className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/partner-billing/select-reports">Partner Billing</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Invoice {invoice.invoice_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Partner Invoice Detail</h1>
        <p className="text-muted-foreground">View and export partner invoice information</p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/partner-billing/select-reports')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Invoice Header */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Partner Invoice</CardTitle>
              <FinancialStatusBadge status={invoice.status} size="sm" showIcon />
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Invoice Details</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Invoice Number:</span> {invoice.invoice_number}</p>
                <p><span className="font-medium">Invoice Date:</span> {format(new Date(invoice.invoice_date), 'PPP')}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Partner Organization</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Name:</span> {invoice.partner_organization.name}</p>
                <p><span className="font-medium">Email:</span> {invoice.partner_organization.contact_email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice.line_items.map((item, index) => (
              <div key={item.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {item.work_order_report.work_order.work_order_number}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-sm text-muted-foreground">
                        {item.work_order_report.work_order.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
                {index < invoice.line_items.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Markup ({invoice.markup_percentage}%):</span>
              <span>{formatCurrency(markupAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-lg">
              <span>Total Amount:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}