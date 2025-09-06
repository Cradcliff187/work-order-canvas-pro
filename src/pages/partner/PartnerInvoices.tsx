import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, DollarSign, Calendar, Receipt } from 'lucide-react';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';
import { InvoiceStatusBadge } from '@/components/admin/partner-billing/InvoiceStatusBadge';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { StandardDashboardStats } from '@/components/dashboard/StandardDashboardStats';
import { StatCard } from '@/components/dashboard/StandardDashboardStats';

export default function PartnerInvoices() {
  const { data: invoices, isLoading } = usePartnerInvoices();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const stats = useMemo(() => {
    if (!invoices?.length) return [];
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const unpaid = invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const thisMonth = invoices
      .filter(i => new Date(i.created_at) >= monthStart).length;

    const statsCards: StatCard[] = [
      {
        icon: DollarSign,
        label: 'Total Invoiced',
        value: formatCurrency(totalInvoiced),
        variant: 'default'
      },
      {
        icon: Receipt,
        label: 'Unpaid Amount',
        value: formatCurrency(unpaid),
        variant: unpaid > 0 ? 'warning' : 'success'
      },
      {
        icon: Calendar,
        label: 'This Month',
        value: thisMonth.toString(),
        variant: 'default'
      }
    ];

    return statsCards;
  }, [invoices]);

  const handleDownloadPdf = (invoice: any) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      toast({
        title: 'PDF Not Available',
        description: 'PDF has not been generated for this invoice yet.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            View invoices from your partner organization
          </p>
        </div>
      </header>
      
      <StandardDashboardStats stats={stats} loading={isLoading} />
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <EnhancedTableSkeleton 
              rows={5} 
              columns={6} 
              showHeader={false} 
              showActions={false} 
            />
          ) : !invoices?.length ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="You haven't received any invoices from your partner organization"
            />
          ) : isMobile ? (
            <div className="space-y-3 p-4">
              {invoices.map(invoice => (
                <Card key={invoice.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        {invoice.invoice_number}
                      </span>
                      <InvoiceStatusBadge 
                        status={invoice.status}
                        size="sm"
                        sentAt={invoice.sent_at}
                      />
                    </div>
                    <p className="text-2xl font-bold mb-2">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <p>Invoice Date: {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
                      {invoice.due_date && (
                        <p>Due Date: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
                      )}
                      {invoice.sent_at && (
                        <p>Sent: {format(new Date(invoice.sent_at), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                    {invoice.pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPdf(invoice)}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 text-sm">Invoice #</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Due Date</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <span className="font-mono text-sm">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td className="p-4">
                        {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4">
                        {invoice.due_date 
                          ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                          : '-'
                        }
                      </td>
                      <td className="p-4">{formatCurrency(invoice.total_amount)}</td>
                      <td className="p-4">
                        <InvoiceStatusBadge 
                          status={invoice.status}
                          size="sm"
                          showIcon
                          sentAt={invoice.sent_at}
                        />
                      </td>
                      <td className="p-4 text-right">
                        {invoice.pdf_url ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadPdf(invoice)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            PDF not available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}