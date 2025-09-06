import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { useOrganizations } from '@/hooks/useOrganizations';
import { formatCurrency } from '@/utils/formatting';
import { format } from 'date-fns';
import { InvoiceStatusBadge } from '@/components/admin/partner-billing/InvoiceStatusBadge';
import { PartnerInvoiceActions } from '@/components/admin/partner-billing/PartnerInvoiceActions';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { EnhancedLoadingState } from '@/components/admin/partner-billing/EnhancedLoadingState';
import { BatchOperations } from '@/components/admin/partner-billing/BatchOperations';
import { InvoiceFilters } from '@/components/admin/partner-billing/InvoiceFilters';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

export default function PartnerInvoices() {
  const navigate = useNavigate();
  const { data: invoices, isLoading } = usePartnerInvoices();
  const { data: organizations } = useOrganizations();
  const isMobile = useIsMobile();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Selection state
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  
  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(invoice => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          invoice.invoice_number?.toLowerCase().includes(searchLower) ||
          invoice.partner_organization?.name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }
      
      // Organization filter
      if (organizationFilter !== 'all' && invoice.partner_organization_id !== organizationFilter) {
        return false;
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        const invoiceDate = new Date(invoice.invoice_date);
        if (dateRange.from && invoiceDate < dateRange.from) return false;
        if (dateRange.to && invoiceDate > dateRange.to) return false;
      }
      
      return true;
    });
  }, [invoices, searchTerm, statusFilter, organizationFilter, dateRange]);

  const stats = useMemo(() => {
    if (!filteredInvoices?.length) return { outstanding: 0, thisMonth: 0, overdue: 0 };
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      outstanding: filteredInvoices
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + (i.total_amount || 0), 0),
      thisMonth: filteredInvoices
        .filter(i => new Date(i.created_at) >= monthStart).length,
      overdue: filteredInvoices
        .filter(i => i.status !== 'paid' && i.due_date && new Date(i.due_date) < now).length
    };
  }, [filteredInvoices]);
  
  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };
  
  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };
  
  const clearSelection = () => {
    setSelectedInvoices([]);
  };
  
  // Filter handlers
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOrganizationFilter('all');
    setDateRange({});
  };
  
  const partnerOrganizations = useMemo(() => {
    return organizations?.filter(org => org.organization_type === 'partner').map(org => ({
      id: org.id,
      name: org.name
    })) || [];
  }, [organizations]);
  
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
      
      <InvoiceFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        organizationFilter={organizationFilter}
        onOrganizationChange={setOrganizationFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        organizations={partnerOrganizations}
        onClearFilters={clearFilters}
      />
      
      {selectedInvoices.length > 0 && (
        <BatchOperations
          selectedInvoices={selectedInvoices}
          onClearSelection={clearSelection}
        />
      )}
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8">
              <EnhancedLoadingState 
                type="general"
                message="Loading partner invoices..."
                subMessage="Fetching invoice data from the database"
              />
            </div>
          ) : !filteredInvoices?.length ? (
            <EmptyState
              icon={FileText}
              title="No partner invoices yet"
              description="Create your first invoice to bill partner organizations"
              action={{
                label: "Create Invoice",
                onClick: () => navigate('/admin/partner-billing/select-reports')
              }}
            />
          ) : isMobile ? (
            <div className="space-y-3 p-4">
              {filteredInvoices.map(invoice => (
                <Card 
                  key={invoice.id}
                  onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {invoice.invoice_number}
                      </span>
                      <InvoiceStatusBadge 
                        status={invoice.status}
                        size="sm"
                        sentAt={invoice.sent_at}
                      />
                    </div>
                    <p className="font-medium text-base mb-2">
                      {invoice.partner_organization?.name}
                    </p>
                    <p className="text-2xl font-bold mb-1">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due {format(new Date(invoice.due_date || invoice.invoice_date), 'MMM d, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[900px]">
                <thead className="border-b">
                  <tr>
                    <th className="w-12 p-4">
                      <Checkbox
                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Select all invoices"
                      />
                    </th>
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
                  {filteredInvoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                          aria-label={`Select invoice ${invoice.invoice_number}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td 
                        className="p-4 cursor-pointer"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                      >
                        <span className="font-mono text-sm">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td 
                        className="p-4 cursor-pointer"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                      >
                        {invoice.partner_organization?.name}
                      </td>
                      <td 
                        className="p-4 cursor-pointer"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                      >
                        {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                      </td>
                      <td 
                        className="p-4 cursor-pointer"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                      >
                        {invoice.due_date 
                          ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                          : '-'
                        }
                      </td>
                      <td 
                        className="p-4 cursor-pointer"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                      >
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td 
                        className="p-4 cursor-pointer"
                        onClick={() => navigate(`/admin/partner-billing/invoices/${invoice.id}`)}
                      >
                        <InvoiceStatusBadge 
                          status={invoice.status}
                          size="sm"
                          showIcon
                          sentAt={invoice.sent_at}
                        />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PartnerInvoiceActions
                            invoice={invoice}
                            variant="buttons"
                          />
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
                        </div>
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