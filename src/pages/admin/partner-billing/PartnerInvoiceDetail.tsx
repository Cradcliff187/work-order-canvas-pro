import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/utils/formatting';
import { ArrowLeft, FileText, Pencil, Trash2 } from 'lucide-react';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { format } from 'date-fns';
import { exportToCSV, ExportColumn } from '@/lib/utils/export';
import { toast } from 'sonner';
import { EditPartnerInvoiceSheet } from '@/components/admin/partner-billing/EditPartnerInvoiceSheet';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface PartnerInvoiceDetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
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
      due_date,
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
  const queryClient = useQueryClient();
  const { data: invoice, isLoading, error, refetch } = usePartnerInvoiceDetail(id!);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    try {
      if (!invoice) return;

      // Prepare data for QuickBooks import format
      const exportData = invoice.line_items.map(item => ({
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

      const baseFilename = `partner_invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
      
      if (exportFormat === 'csv') {
        exportToCSV(exportData, columns, `${baseFilename}.csv`);
      } else {
        // Excel export - using same data structure
        exportToCSV(exportData, columns, `${baseFilename}.xlsx`);
      }
      
      toast.success(`Invoice exported as ${exportFormat.toUpperCase()} successfully`);
    } catch (error) {
      toast.error('Failed to export invoice');
    }
  };

  const confirmDelete = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      // Clear references from work_order_reports
      await supabase
        .from('work_order_reports')
        .update({ partner_invoice_id: null, partner_billed_at: null, partner_billed_amount: null })
        .eq('partner_invoice_id', id);

      // Delete line items
      await supabase
        .from('partner_invoice_line_items')
        .delete()
        .eq('partner_invoice_id', id);

      // Delete the invoice
      const { error } = await supabase
        .from('partner_invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;

      toast.success('Partner invoice deleted');
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      navigate('/admin/partner-billing/select-reports');
    } catch (e) {
      console.error('Failed to delete partner invoice', e);
      toast.error('Failed to delete invoice');
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-7 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Invoice Not Found"
          description="The requested partner invoice could not be found."
          action={{ label: 'Back to Invoices', onClick: () => navigate('/admin/partner-billing/select-reports') }}
        />
      </div>
    );
  }

  const markupAmount = invoice.subtotal * (invoice.markup_percentage / 100);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-popover text-foreground border rounded px-3 py-2 shadow">Skip to main content</a>
      <main id="main-content" role="main" tabIndex={-1} className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/partner-billing/select-reports">Partner Invoices</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Invoice {invoice.invoice_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Partner Invoices</h1>
        <p className="text-muted-foreground">Invoice {invoice.invoice_number} — View and export partner invoice information</p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/partner-billing/select-reports')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Button>
        
        <div className="flex gap-2">
          <ExportDropdown 
            onExport={handleExport}
            variant="outline"
            size="default"
          />
          <TableActionsDropdown
            actions={[
              {
                label: 'Edit Invoice',
                icon: Pencil,
                onClick: () => setEditOpen(true),
              },
              {
                label: 'Delete Invoice',
                icon: Trash2,
                onClick: () => setDeleteOpen(true),
                variant: 'destructive',
              },
            ]}
            align="end"
            itemName={`invoice ${invoice.invoice_number}`}
          />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Invoice Details</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Invoice Number:</span> {invoice.invoice_number}</p>
                <p><span className="font-medium">Invoice Date:</span> {format(new Date(invoice.invoice_date), 'PPP')}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Partner Organization</h3>
              <div className="space-y-2">
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
                <div className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
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

      <EditPartnerInvoiceSheet
        open={editOpen}
        onOpenChange={(open) => setEditOpen(open)}
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: (invoice as any).due_date || null,
          status: invoice.status,
        }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['partner-invoice-detail', id] });
          queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
          refetch();
        }}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        itemName={invoice.invoice_number}
        itemType="partner invoice"
        isLoading={isDeleting}
      />
    </>
  );
}