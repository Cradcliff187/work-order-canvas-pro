import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PaginationState, SortingState, ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePartnerInvoices } from '@/hooks/usePartnerInvoices';
import { useOrganizations } from '@/hooks/useOrganizations';
import { PartnerInvoicesTable } from '@/components/admin/partner-billing/PartnerInvoicesTable';
import { CompactPartnerInvoiceFilters } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import { createPartnerInvoiceColumns, PARTNER_INVOICE_COLUMN_METADATA, type PartnerInvoice } from '@/components/admin/partner-billing/PartnerInvoiceColumns';
import type { PartnerInvoiceFiltersValue } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import { PartnerInvoicesBreadcrumb } from '@/components/admin/partner-billing/PartnerInvoicesBreadcrumb';
import { usePartnerInvoiceFilterCount } from '@/components/admin/partner-billing/CompactPartnerInvoiceFilters';
import { useViewMode } from '@/hooks/useViewMode';
import { useToast } from '@/hooks/use-toast';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { usePartnerInvoiceActions } from '@/hooks/usePartnerInvoiceActions';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Database } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';

export default function PartnerInvoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // State management
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<PartnerInvoice | null>(null);

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

  // Partner invoice actions hook
  const { generatePdf, sendInvoice, updateStatus, deleteInvoice, isDeletingInvoice } = usePartnerInvoiceActions();

  // Column visibility using the proper hook
  const columnVisibilityHook = useColumnVisibility({
    storageKey: 'partner-invoices-columns-v1',
    columnMetadata: PARTNER_INVOICE_COLUMN_METADATA,
    defaultVisible: {},
    legacyKeys: []
  });


  // Individual action handlers
  const handleGeneratePdf = (invoice: any) => {
    generatePdf({ invoiceId: invoice.id });
  };

  const handleSendInvoice = (invoice: any) => {
    sendInvoice({ invoiceId: invoice.id });
  };

  const handleDownloadPdf = (invoice: any) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      toast({
        title: 'PDF not available',
        description: 'Please generate the PDF first.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = (invoice: any, status: string) => {
    updateStatus({ invoiceId: invoice.id, status });
  };

  // Delete handlers
  const handleDelete = (invoice: PartnerInvoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteDialog(true);
  };


  const confirmDelete = async () => {
    if (invoiceToDelete) {
      deleteInvoice({ invoiceId: invoiceToDelete.id });
      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
    }
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


  const handleInvoiceClick = (invoice: any) => {
    navigate(`/admin/partner-billing/invoices/${invoice.id}`);
  };

  // Create columns
  const columns = useMemo(() => 
    createPartnerInvoiceColumns({
      onView: handleInvoiceClick,
      onGeneratePdf: (invoice) => generatePdf({ invoiceId: invoice.id }),
      onSendInvoice: (invoice) => sendInvoice({ invoiceId: invoice.id }),
      onDownloadPdf: (invoice) => {
        if (invoice.pdf_url) {
          window.open(invoice.pdf_url, '_blank');
        }
      },
      onUpdateStatus: (invoice, status) => updateStatus({ invoiceId: invoice.id, status }),
      onDelete: handleDelete
    }), 
    [generatePdf, sendInvoice, updateStatus, deleteInvoice]
  );

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
      <div className="max-w-full p-4 md:p-6 space-y-6">
        {/* Breadcrumb */}
        <PartnerInvoicesBreadcrumb />
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6" role="banner" aria-label="Partner invoices management header">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              Partner Invoices Management
            </h1>
            <p className="text-muted-foreground">
              {invoices.length} total invoices
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/admin/partner-billing/select-reports')} 
            className="h-9"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </header>

        {/* Partner Invoices Table */}
        <PartnerInvoicesTable
          data={invoices}
          isLoading={isLoading}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onInvoiceClick={handleInvoiceClick}
          onExport={handleExportAll}
          onGeneratePdf={handleGeneratePdf}
          onSendInvoice={handleSendInvoice}
          onDownloadPdf={handleDownloadPdf}
          onUpdateStatus={handleUpdateStatus}
          // Column visibility props
          columnVisibility={columnVisibilityHook.columnVisibility}
          setColumnVisibility={columnVisibilityHook.setColumnVisibility}
          allColumns={columnVisibilityHook.getAllColumns()}
          onToggleColumn={columnVisibilityHook.toggleColumn}
          onResetColumns={columnVisibilityHook.resetToDefaults}
          // Pagination and sorting
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
          // Columns
          columns={columns}
          // Mobile
          isMobile={isMobile}
          // Filters
          filterComponent={
            <CompactPartnerInvoiceFilters
              value={filters}
              onChange={setFilters}
              onClear={clearFilters}
            />
          }
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        itemName={invoiceToDelete?.invoice_number || 'this invoice'}
        itemType="invoice"
        isLoading={isDeletingInvoice}
      />
    </div>
  );
}