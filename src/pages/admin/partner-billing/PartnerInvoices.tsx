import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';

export default function PartnerInvoices() {
  const navigate = useNavigate();
  const { data: invoices, isLoading } = usePartnerInvoices();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices sent to partner organizations
          </p>
        </div>
        <Button onClick={() => navigate('/admin/partner-billing/select-reports')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">$0</div>
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">0 days</div>
            <p className="text-sm text-muted-foreground">Avg Payment Time</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading invoices...</div>
          ) : !invoices?.length ? (
            <div className="p-8 text-center">
              <p>No partner invoices yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4">Invoice #</th>
                    <th className="text-left p-4">Partner</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{invoice.invoice_number}</td>
                      <td className="p-4">{invoice.partner_organization?.name}</td>
                      <td className="p-4">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</td>
                      <td className="p-4">{formatCurrency(invoice.total_amount)}</td>
                      <td className="p-4">{invoice.status}</td>
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