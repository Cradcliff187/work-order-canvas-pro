import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { useOrganizations } from '@/hooks/useOrganizations';
import { PartnerInvoicesTable } from '@/components/admin/partner-billing/PartnerInvoicesTable';
import { CompactPartnerInvoiceFilters, usePartnerInvoiceFilterCount, type PartnerInvoiceFiltersValue } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import { useViewMode, ViewMode } from '@/hooks/useViewMode';
import { formatCurrency } from '@/utils/formatting';

export default function PartnerInvoices() {
  const { data: invoices, isLoading, error, refetch } = usePartnerInvoices();
  const { data: organizations } = useOrganizations();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // View mode state
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'partner-invoices',
    config: {
      mobile: ['list'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });
  
  // Filter state (managed by table)
  const [filters, setFilters] = useState<PartnerInvoiceFiltersValue>({});
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    invoice_number: true,
    partner: true,
    date: true,
    due_date: true,
    amount: true,
    status: true,
    actions: true,
  });

  
  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(invoices?.map(inv => inv.id) || []);
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
  
  // Filter helpers
  const clearFilters = () => {
    setFilters({});
  };

  // Column visibility helpers
  const columnVisibilityColumns = [
    { id: 'invoice_number', label: 'Invoice #', visible: columnVisibility.invoice_number, canHide: false },
    { id: 'partner', label: 'Partner', visible: columnVisibility.partner, canHide: true },
    { id: 'date', label: 'Date', visible: columnVisibility.date, canHide: true },
    { id: 'due_date', label: 'Due Date', visible: columnVisibility.due_date, canHide: true },
    { id: 'amount', label: 'Amount', visible: columnVisibility.amount, canHide: false },
    { id: 'status', label: 'Status', visible: columnVisibility.status, canHide: false },
    { id: 'actions', label: 'Actions', visible: columnVisibility.actions, canHide: false },
  ];

  const handleToggleColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId as keyof typeof prev]
    }));
  };

  const handleResetColumns = () => {
    setColumnVisibility({
      invoice_number: true,
      partner: true,
      date: true,
      due_date: true,
      amount: true,
      status: true,
      actions: true,
    });
  };

  const handleBatchAction = (action: string) => {
    console.log(`Batch ${action} for invoices:`, selectedInvoices);
    // TODO: Implement batch actions
  };

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Export invoices as ${format}`);
    // TODO: Implement export functionality
  };

  const handleInvoiceClick = (id: string) => {
    navigate(`/admin/partner-billing/invoices/${id}`);
  };
  
  const partnerOrganizations = useMemo(() => {
    return organizations?.filter(org => org.organization_type === 'partner').map(org => ({
      id: org.id,
      name: org.name
    })) || [];
  }, [organizations]);
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Partner Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices sent to partner organizations
          </p>
          {bulkMode && (
            <p className="text-sm text-primary mt-1">
              Select invoices using checkboxes, then use the action bar below
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => setBulkMode(!bulkMode)}
            className="flex-1 sm:flex-initial h-9"
          >
            <CheckSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{bulkMode ? "Exit Bulk Mode" : "Select Multiple"}</span>
            <span className="sm:hidden">{bulkMode ? "Exit Bulk" : "Select"}</span>
          </Button>
          <Button onClick={() => navigate('/admin/partner-billing/select-reports')} className="flex-1 sm:flex-initial h-9">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </header>

      {/* Batch Actions */}
      {selectedInvoices.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('send')}
              >
                Send Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('mark-paid')}
              >
                Mark as Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoices([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Partner Invoices Table */}
      <PartnerInvoicesTable
        data={invoices || []}
        isLoading={isLoading}
        isError={error}
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedModes={allowedModes}
        filterComponent={
          <CompactPartnerInvoiceFilters
            value={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
        }
        onExport={handleExport}
        onRefresh={refetch}
        isMobile={isMobile}
        selectedInvoices={selectedInvoices}
        onSelectInvoice={handleSelectInvoice}
        onSelectAll={handleSelectAll}
        onInvoiceClick={handleInvoiceClick}
        columnVisibilityColumns={columnVisibilityColumns}
        onToggleColumn={handleToggleColumn}
        onResetColumns={handleResetColumns}
        title="Partner Invoices"
        subtitle="Manage invoices sent to partner organizations"
      />
    </div>
  );
}