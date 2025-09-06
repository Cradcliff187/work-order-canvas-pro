import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

export default function PartnerInvoices() {
  const navigate = useNavigate();
  const { data: invoices, isLoading } = usePartnerInvoices();
  
  const stats = useMemo(() => {
    if (!invoices?.length) return { outstanding: 0, thisMonth: 0, overdue: 0 };
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      outstanding: invoices
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + (i.total_amount || 0), 0),
      thisMonth: invoices
        .filter(i => new Date(i.created_at) >= monthStart).length,
      overdue: invoices
        .filter(i => i.status !== 'paid' && i.due_date && new Date(i.due_date) < now).length
    };
  }, [invoices]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices sent to partner organizations
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown 
            onExport={(format) => console.log('Export', format)}
            disabled={!invoices?.length || isLoading}
          />
          <Button onClick={() => navigate('/admin/partner-billing/select-reports')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{formatCurrency(stats.outstanding)}</div>
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.overdue}</div>
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
            <EnhancedTableSkeleton 
              rows={5} 
              columns={7} 
              showHeader={false} 
              showActions={false} 
            />
          ) : !invoices?.length ? (
            <EmptyState
              icon={FileText}
              title="No partner invoices yet"
              description="Create your first invoice to bill partner organizations"
              action={{
                label: "Create Invoice",
                onClick: () => navigate('/admin/partner-billing/select-reports')
              }}
            />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 text-sm">Invoice #</th>
                    <th className="text-left p-4">Partner</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Due Date</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                    >
                      <td className="p-4">
                        <span className="font-mono text-sm">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td className="p-4">{invoice.partner_organization?.name}</td>
                      <td className="p-4">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</td>
                      <td className="p-4">
                        {invoice.due_date 
                          ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                          : '-'
                        }
                      </td>
                      <td className="p-4">{formatCurrency(invoice.total_amount)}</td>
                      <td className="p-4">
                        <FinancialStatusBadge status={invoice.status} size="sm" showIcon />
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/partner-billing/invoices/${invoice.id}`);
                          }}
                        >
                          View
                        </Button>
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