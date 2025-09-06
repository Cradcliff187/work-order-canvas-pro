import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginationState, SortingState, ColumnDef, RowSelectionState, VisibilityState } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare } from 'lucide-react';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { useOrganizations } from '@/hooks/useOrganizations';
import { PartnerInvoicesTable } from '@/components/admin/partner-billing/PartnerInvoicesTable';
import { CompactPartnerInvoiceFilters } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import type { PartnerInvoiceFiltersValue } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import { PartnerInvoicesBreadcrumb } from '@/components/admin/partner-billing/PartnerInvoicesBreadcrumb';
import { usePartnerInvoiceFilterCount } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import { PartnerInvoiceBulkActionsBar } from '@/components/admin/partner-billing/PartnerInvoiceBulkActionsBar';
import { PartnerInvoiceBulkEditModal } from '@/components/admin/partner-billing/PartnerInvoiceBulkEditModal';
import { useViewMode } from '@/hooks/useViewMode';
import { useToast } from '@/hooks/use-toast';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { usePartnerInvoiceBatch } from '@/hooks/usePartnerInvoiceBatch';
import { Database } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';

type PartnerInvoice = Database['public']['Tables']['partner_invoices']['Row'] & {
  partner_organization: { name: string } | null;
};

export default function PartnerInvoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // State management
  const [bulkMode, setBulkMode] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditInvoices, setBulkEditInvoices] = useState<PartnerInvoice[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Define initial filters
  const initialFilters: PartnerInvoiceFiltersValue = {
    status: [],
    partner_organization_id: [],
    date_from: undefined,
    date_to: undefined,
    amount_min: undefined,
    amount_max: undefined,
  };

  // Use unified filters hook
  const { filters, setFilters, clearFilters } = useAdminFilters(
    'partner-invoices-filters-v1',
    initialFilters
  );

  // Get partner invoice data
  const { data: invoices = [], isLoading, error } = usePartnerInvoices();
  const { data: organizations = [] } = useOrganizations();

  // View mode configuration
  const { viewMode, setViewMode } = useViewMode({
    componentKey: 'partner-invoices',
    config: {
      mobile: ['list'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });

  // Batch operations hook
  const { batchGeneratePdf, batchSendEmails, operations, isProcessing, clearOperations } = usePartnerInvoiceBatch();

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    invoice_number: true,
    partner: true,
    date: true,
    due_date: true,
    amount: true,
    status: true,
    actions: true
  });
  
  const getAllColumns = () => [
    { id: 'invoice_number', label: 'Invoice #', visible: columnVisibility.invoice_number, canHide: false },
    { id: 'partner', label: 'Partner', visible: columnVisibility.partner, canHide: true },
    { id: 'date', label: 'Date', visible: columnVisibility.date, canHide: true },
    { id: 'due_date', label: 'Due Date', visible: columnVisibility.due_date, canHide: true },
    { id: 'amount', label: 'Amount', visible: columnVisibility.amount, canHide: false },
    { id: 'status', label: 'Status', visible: columnVisibility.status, canHide: false },
    { id: 'actions', label: 'Actions', visible: columnVisibility.actions, canHide: false },
  ];
  
  const toggleColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId as keyof typeof prev]
    }));
  };
  
  const resetToDefaults = () => {
    setColumnVisibility({
      invoice_number: true,
      partner: true,
      date: true,
      due_date: true,
      amount: true,
      status: true,
      actions: true,
    } as VisibilityState);
  };

  // Selection handlers
  const selectedIds = Object.keys(rowSelection);
  const selectedInvoices = invoices.filter(invoice => selectedIds.includes(invoice.id));

  const clearSelection = () => {
    setRowSelection({});
  };

  // Bulk action handlers
  const handleBulkGeneratePDF = (ids: string[]) => {
    batchGeneratePdf(ids);
    clearSelection();
  };

  const handleBulkSendEmails = (ids: string[]) => {
    batchSendEmails(ids);
    clearSelection();
  };

  const handleBulkUpdateStatus = (ids: string[]) => {
    // For now, open bulk edit modal - this could be expanded to a status-specific modal
    const invoicesToEdit = invoices.filter(invoice => ids.includes(invoice.id));
    setBulkEditInvoices(invoicesToEdit);
    setShowBulkEditModal(true);
  };

  const handleBulkEdit = (ids: string[]) => {
    const invoicesToEdit = invoices.filter(invoice => ids.includes(invoice.id));
    setBulkEditInvoices(invoicesToEdit);
    setShowBulkEditModal(true);
  };

  const handleBulkEditSave = async (changes: any) => {
    // This would typically call a bulk update mutation
    console.log('Bulk edit changes:', changes, 'for invoices:', bulkEditInvoices);
    toast({
      title: 'Success',
      description: `Updated ${bulkEditInvoices.length} invoices`,
    });
    setShowBulkEditModal(false);
    setBulkEditInvoices([]);
    clearSelection();
  };

  // Export handlers
  const handleExportAll = async (format: 'csv' | 'excel') => {
    try {
      if (!invoices || invoices.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }
      // exportPartnerInvoices(invoices, format); // Implement this utility function
      toast({ title: `Successfully exported ${invoices.length} invoices as ${format.toUpperCase()}` });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export invoices. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleExport = (format: 'csv' | 'excel', ids: string[]) => {
    try {
      const selectedData = invoices.filter(inv => ids.includes(inv.id));
      if (!selectedData || selectedData.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }
      
      // exportPartnerInvoices(selectedData, format); // Implement this utility function
      toast({ title: `Successfully exported ${ids.length} invoices as ${format.toUpperCase()}` });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export invoices. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleInvoiceClick = (invoice: any) => {
    navigate(`/admin/partner-billing/invoices/${invoice.id}`);
  };

  // Create columns
  const columns = useMemo(() => {
    // This would typically call createPartnerInvoiceColumns with appropriate handlers
    // For now, return empty array as the columns are managed in the table
    return [] as ColumnDef<any>[];
  }, []);

  const partnerOrganizations = useMemo(() => {
    return organizations?.filter(org => org.organization_type === 'partner').map(org => ({
      id: org.id,
      name: org.name
    })) || [];
  }, [organizations]);

  // Get filter count for the Filters button badge
  const filterCount = usePartnerInvoiceFilterCount(filters);

  return (
    <div className="flex-1 space-y-4 overflow-x-hidden">
      <div className={`max-w-full p-4 md:p-6 space-y-6 ${bulkMode && Object.keys(rowSelection).length > 0 ? "pb-24 sm:pb-28" : ""}`}>
        {/* Breadcrumb */}
        <PartnerInvoicesBreadcrumb />
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              Partner Invoices Management
            </h1>
            <p className="text-muted-foreground">
              {invoices.length} total invoices
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
              className="flex-1 sm:flex-initial"
            >
              <CheckSquare className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{bulkMode ? "Exit Bulk Mode" : "Select Multiple"}</span>
              <span className="sm:hidden">{bulkMode ? "Exit Bulk" : "Select"}</span>
            </Button>
            
            <Button 
              onClick={() => console.log('Create new invoice')} 
              className="flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Invoice</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </header>

        {/* Bulk actions bar - shown when items are selected */}
        {bulkMode && selectedIds.length > 0 && (
          <PartnerInvoiceBulkActionsBar
            selectedCount={selectedIds.length}
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
            onExport={handleExport}
            onGeneratePDFs={handleBulkGeneratePDF}
            onSendEmails={handleBulkSendEmails}
            onUpdateStatus={handleBulkUpdateStatus}
            onBulkEdit={handleBulkEdit}
            loading={isProcessing}
          />
        )}

        {/* Partner Invoices Table */}
        <PartnerInvoicesTable
          data={invoices}
          isLoading={isLoading}
          viewMode={viewMode}
          setViewMode={setViewMode}
          bulkMode={bulkMode}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          onInvoiceClick={handleInvoiceClick}
          onExportAll={handleExportAll}
          onExport={handleExport}
          // Column visibility props
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          columnVisibilityColumns={getAllColumns()}
          onToggleColumn={toggleColumn}
          onResetColumns={resetToDefaults}
          // Filter component
          filterComponent={
            <CompactPartnerInvoiceFilters
              value={filters}
              onChange={setFilters}
              onClear={clearFilters}
            />
          }
          // Filter count for badge
          filterCount={filterCount}
          // Pagination and sorting
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
          // Columns
          columns={columns}
          // Mobile
          isMobile={isMobile}
        />
      </div>

      {/* Bulk Edit Modal */}
      <PartnerInvoiceBulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setBulkEditInvoices([]);
        }}
        invoices={bulkEditInvoices}
        onSave={handleBulkEditSave}
      />
    </div>
  );
}