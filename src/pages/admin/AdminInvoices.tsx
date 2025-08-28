import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import { UnifiedInvoiceFilters } from '@/components/admin/invoices/UnifiedInvoiceFilters';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { createInvoiceColumns } from '@/components/admin/invoices/InvoiceColumns';
import { EditInvoiceSheet } from '@/components/admin/invoices/EditInvoiceSheet';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { BulkEditSheet } from '@/components/admin/invoices/BulkEditSheet';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChevronLeft, ChevronRight, FileText, DollarSign, Plus, RotateCcw, CheckCircle, XCircle, Filter, CheckSquare, Search, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useViewMode } from '@/hooks/useViewMode';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { toast } from '@/hooks/use-toast';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { StatusBadge, FinancialStatusBadge } from '@/components/ui/status-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { CompactInvoiceFilters } from '@/components/admin/invoices/CompactInvoiceFilters';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { cn } from '@/lib/utils';
import { type InvoiceFiltersValue } from '@/components/admin/invoices/InvoiceFilters';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { LoadingCard } from '@/components/ui/loading-states';
import { EmptyState } from '@/components/ui/empty-state';

export default function AdminInvoices() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Initialize isInitialMount ref at component level
  const isInitialMount = useRef(true);
  
  // Get initial filters with new filter structure  
  const getInitialFilters = () => {
    try {
      const stored = localStorage.getItem('admin-invoices-filters-v2');
      if (stored) {
        // User has used filters before, don't apply default
        return {
          search: '',
          overdue: false,
          partner_organization_id: undefined as string | undefined,
          location_filter: [] as string[],
          subcontractor_organization_id: undefined as string | undefined,
          operational_status: [] as string[],
          report_status: [] as string[],
          invoice_status: [] as string[],
          partner_billing_status: [] as string[],
        };
      } else {
        // First time user, apply "submitted" as default for invoice_status
        return {
          search: '',
          overdue: false,
          partner_organization_id: undefined as string | undefined,
          location_filter: [] as string[],
          subcontractor_organization_id: undefined as string | undefined,
          operational_status: [] as string[],
          report_status: [] as string[],
          invoice_status: ['submitted'] as string[],
          partner_billing_status: [] as string[],
        };
      }
    } catch (error) {
      // If localStorage access fails, use default with submitted filter
      return {
        search: '',
        overdue: false,
        partner_organization_id: undefined as string | undefined,
        location_filter: [] as string[],
        subcontractor_organization_id: undefined as string | undefined,
        operational_status: [] as string[],
        report_status: [] as string[],
        invoice_status: ['submitted'] as string[],
        partner_billing_status: [] as string[],
      };
    }
  };

  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters('admin-invoices-filters-v2', getInitialFilters());

  // Filter sheet state - removed unused state variables

  
  // Wrapper function to handle compact filter changes
  const handleCompactFiltersChange = (compactFilters: InvoiceFiltersValue) => {
    // Merge compact filters with existing admin filters
    setFilters({
      ...filters,
      search: compactFilters.search || filters.search,
      overdue: compactFilters.overdue || false,
      partner_organization_id: compactFilters.partner_organization_id,
      location_filter: compactFilters.location_filter || [],
      subcontractor_organization_id: compactFilters.subcontractor_organization_id,
      operational_status: compactFilters.operational_status || [],
      report_status: compactFilters.report_status || [],
      invoice_status: compactFilters.invoice_status || [],
      partner_billing_status: compactFilters.partner_billing_status || [],
    });
  };

  // Convert admin filters to compact format for CompactInvoiceFilters
  const compactFilters: InvoiceFiltersValue = {
    search: filters.search,
    overdue: filters.overdue || false,
    partner_organization_id: filters.partner_organization_id,
    location_filter: filters.location_filter || [],
    subcontractor_organization_id: filters.subcontractor_organization_id,
    operational_status: filters.operational_status || [],
    report_status: filters.report_status || [],
    invoice_status: filters.invoice_status || [],
    partner_billing_status: filters.partner_billing_status || [],
  };
  const { approveInvoice, rejectInvoice, markAsPaid } = useInvoiceMutations();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'admin-invoices',
    config: {
      mobile: ['card'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setEditOpen(true);
  };
  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('invoice_work_orders').delete().eq('invoice_id', invoiceToDelete.id);
      await supabase.from('invoice_attachments').delete().eq('invoice_id', invoiceToDelete.id);
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete.id);
      if (error) throw error;
    } catch (e) {
      console.error('Failed to delete invoice', e);
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setInvoiceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  };


  // Stable debounced search to prevent new function creation
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search || '');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.search]);

  const { data, isLoading, error, refetch } = useInvoices({ ...filters, search: debouncedSearch, page, limit });

  // Optimize dependencies with useMemo for stable references
  const stableFilterDeps = useMemo(() => ({
    debouncedSearch,
    overdue: filters.overdue,
    partner_organization_id: filters.partner_organization_id,
    location_filter: filters.location_filter?.sort().join(','),
    subcontractor_organization_id: filters.subcontractor_organization_id,
    operational_status: filters.operational_status?.sort().join(','),
    report_status: filters.report_status?.sort().join(','),
    invoice_status: filters.invoice_status?.sort().join(','),
    partner_billing_status: filters.partner_billing_status?.sort().join(','),
  }), [
    debouncedSearch,
    filters.overdue,
    filters.partner_organization_id,
    filters.location_filter?.sort().join(','),
    filters.subcontractor_organization_id,
    filters.operational_status?.sort().join(','),
    filters.report_status?.sort().join(','),
    filters.invoice_status?.sort().join(','),
    filters.partner_billing_status?.sort().join(','),
  ]);

  // Reset page when filters change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    console.log('📄 Resetting to page 1 due to filter change');
    setPage(1);
  }, [stableFilterDeps]); // Use stable dependency object
  
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleApproveInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleRejectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const columns = createInvoiceColumns({
    onViewInvoice: handleViewInvoice,
    onApproveInvoice: handleApproveInvoice,
    onRejectInvoice: handleRejectInvoice,
    onMarkAsPaid: handleMarkAsPaid,
    onEditInvoice: handleEditInvoice,
    onDeleteInvoice: handleDeleteInvoice,
  });

  // Column visibility setup for invoices
  const columnMetadata = {
    select: { label: 'Select', defaultVisible: true },
    internal_invoice_number: { label: 'Invoice #', defaultVisible: true },
    external_invoice_number: { label: 'Vendor Invoice #', defaultVisible: true },
    work_orders: { label: 'Work Orders', defaultVisible: true },
    attachment_count: { label: 'Attachments', defaultVisible: true },
    'subcontractor_organization.name': { label: 'Partner', defaultVisible: true },
    total_amount: { label: 'Amount', defaultVisible: true },
    status: { label: 'Status', defaultVisible: true },
    date: { label: 'Date', defaultVisible: true },
    due_date: { label: 'Due Date', defaultVisible: true },
    paid_at: { label: 'Paid At', defaultVisible: true },
    actions: { label: 'Actions', defaultVisible: true },
  } as const;

  const {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns,
} = useColumnVisibility({
  storageKey: 'admin-invoices-columns-v1',
  legacyKeys: ['admin-invoices-column-visibility'],
  columnMetadata: columnMetadata as any,
});

  const columnOptions = getAllColumns().map((c) => ({
    ...c,
    canHide: c.id !== 'select' && c.id !== 'actions' && c.id !== 'work_orders',
  }));

const table = useReactTable({
  data: (data?.data || []) as Invoice[],
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getRowId: (row) => row.id,
  onRowSelectionChange: setRowSelection,
  onSortingChange: setSorting,
  onColumnVisibilityChange: setColumnVisibility,
  state: {
    rowSelection,
    sorting,
    columnVisibility,
  },
});

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const INVOICE_COLUMN_METADATA = {
    columns: [
      { id: 'internal_invoice_number', label: 'Invoice #', defaultVisible: true },
      { id: 'external_invoice_number', label: 'Vendor Invoice #', defaultVisible: true },
      { id: 'subcontractor', label: 'Subcontractor', defaultVisible: true },
      { id: 'total_amount', label: 'Amount', defaultVisible: true },
      { id: 'status', label: 'Status', defaultVisible: true },
      { id: 'due_date', label: 'Due Date', defaultVisible: true },
      { id: 'work_orders', label: 'Work Orders', defaultVisible: false },
      { id: 'created_at', label: 'Created', defaultVisible: false },
    ]
  };

  const exportColumns: ExportColumn[] = [
    { key: 'internal_invoice_number', label: 'Invoice #', type: 'string' },
    { key: 'external_invoice_number', label: 'Vendor Invoice #', type: 'string' },
    { key: 'subcontractor_name', label: 'Subcontractor', type: 'string' },
    { key: 'total_amount', label: 'Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'work_orders', label: 'Work Orders', type: 'string' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ];

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    const exportData = data?.data?.map(invoice => ({
      'Invoice #': invoice.internal_invoice_number,
      'Vendor Invoice #': invoice.external_invoice_number || '',
      'Subcontractor': invoice.subcontractor_organization?.name || '',
      'Amount': invoice.total_amount,
      'Status': invoice.status,
      'Due Date': invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '',
      'Work Orders': invoice.invoice_work_orders?.map(iwo => iwo.work_order?.work_order_number).filter(Boolean).join(', ') || '',
      'Created': format(new Date(invoice.created_at), 'yyyy-MM-dd'),
    }));
    
    const filename = `invoices-${exportFormat === 'csv' ? 'export' : 'report'}-${Date.now()}`;
    if (exportFormat === 'csv') {
      exportToCSV(exportData || [], exportColumns, filename);
    } else {
      exportToExcel(exportData || [], exportColumns, filename);
    }
    
    toast({
      title: "Export Complete",
      description: `Exported ${exportData?.length || 0} invoices as ${exportFormat.toUpperCase()}`
    });
  };


  const handleBulkApprove = () => {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    ids.forEach(id => approveInvoice.mutate({ invoiceId: id }));
    setBulkOpen(false);
    setRowSelection({});
  };

  const handleBulkReject = () => {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    ids.forEach(id => rejectInvoice.mutate({ invoiceId: id, notes: 'Rejected via bulk action' }));
    setBulkOpen(false);
    setRowSelection({});
  };

  const handleBulkMarkPaid = () => {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    const now = new Date();
    ids.forEach(id => markAsPaid.mutate({ invoiceId: id, paymentReference: 'BULK', paymentDate: now }));
    setBulkOpen(false);
    setRowSelection({});
  };


  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil((data?.totalCount || 0) / limit);

  return error ? (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-destructive">We couldn't load invoices. Please try again.</p>
            <Button onClick={() => refetch()} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="p-6 overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-popover text-foreground border rounded px-3 py-2 shadow">Skip to main content</a>
      <main id="main-content" role="main" tabIndex={-1} className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Subcontractor Invoices</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Subcontractor Invoices
          </h1>
          <p className="text-muted-foreground">
            {data?.totalCount || 0} total invoices
          </p>
          {bulkMode && (
            <p className="text-sm text-primary mt-1">
              {selectedCount} invoice{selectedCount === 1 ? '' : 's'} selected
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => setBulkMode(!bulkMode)}
            className="flex-1 sm:flex-initial min-h-[44px]"
          >
            <CheckSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{bulkMode ? "Exit Bulk Mode" : "Select Multiple"}</span>
            <span className="sm:hidden">{bulkMode ? "Exit" : "Select"}</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/admin/submit-invoice')} 
            className="flex-1 sm:flex-initial min-h-[44px]"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {/* Results */}
      {isMobile ? (
        <MobilePullToRefresh onRefresh={async () => { await refetch(); }}>
          {/* Mobile toolbar */}
          <div className="bg-muted/30 border rounded-lg p-3 space-y-3 mb-4">
            {/* Mobile search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <SmartSearchInput
                placeholder="Search invoices..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                storageKey="admin-invoices-search"
                className="pl-10 pr-10 min-h-[44px] w-full"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 min-h-[44px] min-w-[44px] p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Mobile filters and actions */}
            <div className="flex items-center gap-2">
              <CompactInvoiceFilters
                value={compactFilters}
                onChange={handleCompactFiltersChange}
                onClear={clearFilters}
              />
              
              {bulkMode && selectedCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="shrink-0 min-h-[44px] px-3 text-xs"
                >
                  <span className="hidden sm:inline">Clear ({selectedCount})</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Mobile content */}
          <div className="space-y-4">
            {isLoading ? (
              <LoadingCard count={5} />
            ) : data?.data?.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices found"
                description={
                  filterCount > 0 
                    ? "No invoices match your current filters."
                    : "No subcontractor invoices have been submitted yet."
                }
                action={filterCount === 0 ? {
                  label: "Create Invoice",
                  onClick: () => navigate('/admin/submit-invoice'),
                  icon: Plus
                } : undefined}
              />
            ) : (
              data?.data?.map((invoice) => {
                const canApprove = invoice.status === 'submitted';
                const canMarkPaid = invoice.status === 'approved' && !invoice.paid_at;

                const cardContent = (
                  <MobileTableCard
                    key={invoice.id}
                    title={invoice.internal_invoice_number || 'N/A'}
                    subtitle={`${invoice.subcontractor_organization?.name || 'Unknown'}`}
                    badge={
                      <FinancialStatusBadge 
                        status={invoice.status === 'submitted' ? 'pending' : invoice.status} 
                        size="sm" 
                        showIcon 
                      />
                    }
                    data={{
                      'Amount': formatCurrency(invoice.total_amount),
                      'Due': format(new Date(invoice.due_date), 'MMM d, yyyy'),
                      'Work Orders': String(invoice.invoice_work_orders?.length || 0)
                    }}
                    actions={[
                      { label: 'View', icon: FileText, onClick: () => handleViewInvoice(invoice) },
                      { 
                        label: 'Approve', 
                        icon: CheckCircle, 
                        onClick: () => handleApproveInvoice(invoice),
                        show: canApprove
                      }
                    ]}
                    onClick={() => handleViewInvoice(invoice)}
                    className="min-h-[44px]"
                  />
                );

                return (
                  <SwipeableListItem
                    key={invoice.id}
                    disabled={!(canApprove || canMarkPaid)}
                    rightAction={canApprove ? { icon: CheckCircle, label: 'Approve', color: 'success' } : (canMarkPaid ? { icon: DollarSign, label: 'Mark Paid', color: 'success' } : undefined)}
                    leftAction={canApprove ? { icon: XCircle, label: 'Reject', color: 'destructive', confirmMessage: 'Reject this invoice?' } : undefined}
                    onSwipeRight={() => {
                      if (canApprove) {
                        approveInvoice.mutate({ invoiceId: invoice.id });
                      } else if (canMarkPaid) {
                        markAsPaid.mutate({ invoiceId: invoice.id, paymentReference: 'MOBILE', paymentDate: new Date() });
                      }
                    }}
                    onSwipeLeft={canApprove ? () => rejectInvoice.mutate({ invoiceId: invoice.id, notes: 'Rejected via swipe' }) : undefined}
                  >
                    {cardContent}
                  </SwipeableListItem>
                );
              })
            )}
          </div>
        </MobilePullToRefresh>
      ) : (
        /* Desktop view */
        <Card className="overflow-hidden">
          {/* Desktop toolbar */}
          <div className="border-b">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
              {/* Left side - Title and view mode */}
              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-none tracking-tight">
                    Invoices
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data?.totalCount || 0} total invoice{(data?.totalCount || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                
                {/* View mode switcher - Desktop only */}
                <ViewModeSwitcher
                  value={viewMode}
                  onValueChange={setViewMode}
                  allowedModes={allowedModes}
                  className="shrink-0"
                />
              </div>

              {/* Right side - Search and Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Selection clear */}
                {bulkMode && selectedCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setRowSelection({})}
                    className="shrink-0 min-h-[44px]"
                  >
                    <span className="hidden sm:inline">Clear ({selectedCount})</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                )}

                {/* Search */}
                <div className="relative flex-1 sm:flex-initial sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <SmartSearchInput
                    placeholder="Search invoice #, vendor, amount..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    storageKey="admin-invoices-search"
                    className="pl-10 pr-10 h-10 min-h-[44px]"
                  />
                  {filters.search && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({ ...filters, search: '' })}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted min-h-[44px] min-w-[44px]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Compact filters */}
                <CompactInvoiceFilters
                  value={compactFilters}
                  onChange={handleCompactFiltersChange}
                  onClear={clearFilters}
                />

                {/* Desktop only controls */}
                <ColumnVisibilityDropdown
                  columns={columnOptions}
                  onToggleColumn={toggleColumn}
                  onResetToDefaults={resetToDefaults}
                  variant="outline"
                  size="sm"
                />
                <ExportDropdown 
                  onExport={handleExport} 
                  variant="outline" 
                  size="sm" 
                  disabled={isLoading || (data?.data?.length ?? 0) === 0} 
                />
              </div>
            </div>
          </div>

          <CardContent className="p-0 overflow-hidden">
            {isLoading ? (
              <TableSkeleton 
                rows={10} 
                columns={INVOICE_COLUMN_METADATA.columns.length}
              />
            ) : data?.data?.length === 0 ? (
              <EmptyTableState
                icon={FileText}
                title="No invoices found"
                description={
                  filterCount > 0 
                    ? "No invoices match your current filters."
                    : "No subcontractor invoices have been submitted yet."
                }
                action={filterCount === 0 ? {
                  label: "Create Invoice",
                  onClick: () => navigate('/admin/submit-invoice'),
                  icon: Plus
                } : undefined}
                colSpan={columns.length}
              />
            ) : (
              <>
                {/* Table View */}
                {viewMode === 'table' && (
                  <ResponsiveTableContainer>
                    <Table className="admin-table">
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`View invoice ${row.original.internal_invoice_number || row.original.id}`}
                              data-state={row.getIsSelected() && 'selected'}
                              className="cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                              onClick={() => {
                                const invoice = row.original;
                                handleViewInvoice(invoice);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  const invoice = row.original;
                                  handleViewInvoice(invoice);
                                }
                              }}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell 
                                  key={cell.id}
                                  className="min-h-[44px]"
                                  onClick={(e) => {
                                    // Prevent row click when interacting with dropdown or checkboxes
                                    const target = e.target as HTMLElement;
                                    if (target.closest('[data-radix-collection-item]') || 
                                        target.closest('input[type="checkbox"]') ||
                                        target.closest('button')) {
                                      e.stopPropagation();
                                    }
                                  }}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : null}
                      </TableBody>
                    </Table>
                  </ResponsiveTableContainer>
                )}

                {/* Card View */}
                {viewMode === 'card' && (
                  <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 p-6">
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const invoice = row.original;
                        
                        return (
                          <div key={row.id} className="relative">
                            <MobileTableCard
                              title={invoice.internal_invoice_number || 'N/A'}
                              subtitle={`${invoice.subcontractor_organization?.name || 'Unknown'}`}
                              badge={
                                <FinancialStatusBadge 
                                  status={invoice.status === 'submitted' ? 'pending' : invoice.status} 
                                  size="sm" 
                                  showIcon 
                                />
                              }
                              data={{
                                'Amount': formatCurrency(invoice.total_amount),
                                'Submitted': invoice.submitted_at ? format(new Date(invoice.submitted_at), 'MMM d, yyyy') : 'N/A',
                                'Work Orders': String(invoice.invoice_work_orders?.length || 0)
                              }}
                              actions={[
                                { label: 'View', icon: FileText, onClick: () => handleViewInvoice(invoice) },
                                { 
                                  label: 'Approve', 
                                  icon: CheckCircle, 
                                  onClick: () => handleApproveInvoice(invoice),
                                  show: invoice.status === 'submitted'
                                }
                              ]}
                              onClick={() => handleViewInvoice(invoice)}
                              className="min-h-[44px]"
                            />
                            {bulkMode && (
                              <div className="absolute top-2 right-2">
                                <input
                                  type="checkbox"
                                  checked={row.getIsSelected()}
                                  onChange={row.getToggleSelectedHandler()}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-gray-300 scale-125 min-w-[44px] min-h-[44px]"
                                  aria-label={`Select invoice ${invoice.internal_invoice_number}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : null}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

    {/* Pagination */}
    {totalPages > 1 && (
      <div className={`flex items-center py-4 ${isMobile ? 'flex-col space-y-4' : 'justify-between space-x-2'}`}>
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} {isMobile ? 'items' : 'row(s)'} selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="min-h-[44px] px-4"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <div className="text-sm font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="min-h-[44px] px-4"
          >
            <span className="hidden sm:inline mr-2">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}

      {/* Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedInvoice(null);
        }}
      />

      <BulkEditSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedCount={selectedCount}
        onApproveSelected={handleBulkApprove}
        onRejectSelected={handleBulkReject}
        onMarkPaidSelected={handleBulkMarkPaid}
      />

      <EditInvoiceSheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setInvoiceToEdit(null);
        }}
        invoice={invoiceToEdit}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          refetch();
        }}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setInvoiceToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={invoiceToDelete?.internal_invoice_number || ''}
        itemType="invoice"
        isLoading={isDeleting}
      />
      </main>
    </div>
  );
}
