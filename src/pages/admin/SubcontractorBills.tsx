import React, { useState, useEffect, useMemo } from 'react';
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
import { useSubcontractorBills, SubcontractorBill } from '@/hooks/useSubcontractorBills';
import { CompactSubcontractorBillFilters } from "@/components/admin/subcontractor-bills/CompactSubcontractorBillFilters";
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { createBillColumns } from '@/components/admin/invoices/InvoiceColumns';
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
import { useSubcontractorBillMutations } from '@/hooks/useSubcontractorBillMutations';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { toast } from '@/hooks/use-toast';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { StatusBadge, FinancialStatusBadge } from '@/components/ui/status-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { cn } from '@/lib/utils';
import { type SubcontractorBillFiltersValue } from '@/types/subcontractor-bills';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { LoadingCard } from '@/components/ui/loading-states';
import { EmptyState } from '@/components/ui/empty-state';

// Define clean initial filters structure outside component
const initialFilters: SubcontractorBillFiltersValue = {
  search: '',
  overdue: false,
  partner_organization_ids: [],
  location_filter: [],
  subcontractor_organization_ids: [],
  status: [],
  payment_status: [],
};

export default function SubcontractorBills() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedBill, setSelectedBill] = useState<SubcontractorBill | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  
  
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters('admin-subcontractor-bills-filters-v1', initialFilters);


  const handleClearFilters = () => {
    clearFilters();
  };
  
  const handleFiltersChange = (newFilters: SubcontractorBillFiltersValue) => {
    setFilters(newFilters);
  };
  const { approveSubcontractorBill, rejectSubcontractorBill, markAsPaid } = useSubcontractorBillMutations();
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
  const [invoiceToEdit, setInvoiceToEdit] = useState<SubcontractorBill | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<SubcontractorBill | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditBill = (invoice: SubcontractorBill) => {
    setInvoiceToEdit(invoice);
    setEditOpen(true);
  };
  const handleDeleteBill = (invoice: SubcontractorBill) => {
    setBillToDelete(invoice);
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!billToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('subcontractor_bill_work_orders').delete().eq('subcontractor_bill_id', billToDelete.id);
      await supabase.from('subcontractor_bill_attachments').delete().eq('subcontractor_bill_id', billToDelete.id);
      const { error } = await supabase.from('subcontractor_bills').delete().eq('id', billToDelete.id);
      if (error) throw error;
    } catch (e) {
      console.error('Failed to delete invoice', e);
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setBillToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
    }
  };


  // Transform filters to match hook expectations
  const transformedFilters = useMemo(() => {
    return {
      ...filters,
      status: filters.status?.[0], // Convert array to single value
      page
    };
  }, [filters, page]);

  const { data, isLoading, error, refetch } = useSubcontractorBills(transformedFilters);

  
  const handleViewBill = (invoice: SubcontractorBill) => {
    setSelectedBill(invoice);
    setModalOpen(true);
  };

  const handleApproveBill = (invoice: SubcontractorBill) => {
    setSelectedBill(invoice);
    setModalOpen(true);
  };

  const handleRejectBill = (invoice: SubcontractorBill) => {
    setSelectedBill(invoice);
    setModalOpen(true);
  };

  const handleMarkAsPaid = (invoice: SubcontractorBill) => {
    setSelectedBill(invoice);
    setModalOpen(true);
  };

  const columns = createBillColumns({
    onViewBill: handleViewBill,
    onApproveBill: handleApproveBill,
    onRejectBill: handleRejectBill,
    onMarkAsPaid: handleMarkAsPaid,
    onEditBill: handleEditBill,
    onDeleteBill: handleDeleteBill,
  });

  // Column visibility setup for bills
  const columnMetadata = {
    select: { label: 'Select', defaultVisible: true },
    internal_bill_number: { label: 'Bill #', defaultVisible: true },
    external_bill_number: { label: 'Vendor Invoice #', defaultVisible: true },
    work_orders: { label: 'Work Orders', defaultVisible: true },
    attachment_count: { label: 'Attachments', defaultVisible: true },
    'subcontractor_organization.name': { label: 'Subcontractor', defaultVisible: true },
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
  data: (data?.data || []) as SubcontractorBill[],
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
      { id: 'internal_bill_number', label: 'Bill #', defaultVisible: true },
      { id: 'external_bill_number', label: 'Vendor Invoice #', defaultVisible: true },
      { id: 'subcontractor', label: 'Subcontractor', defaultVisible: true },
      { id: 'total_amount', label: 'Amount', defaultVisible: true },
      { id: 'status', label: 'Status', defaultVisible: true },
      { id: 'due_date', label: 'Due Date', defaultVisible: true },
      { id: 'work_orders', label: 'Work Orders', defaultVisible: false },
      { id: 'created_at', label: 'Created', defaultVisible: false },
    ]
  };

  const exportColumns: ExportColumn[] = [
    { key: 'internal_bill_number', label: 'Bill #', type: 'string' },
    { key: 'external_bill_number', label: 'Vendor Invoice #', type: 'string' },
    { key: 'subcontractor_name', label: 'Subcontractor', type: 'string' },
    { key: 'total_amount', label: 'Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'work_orders', label: 'Work Orders', type: 'string' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ];

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    const exportData = data?.data?.map(invoice => ({
      'Bill #': invoice.internal_bill_number,
      'Vendor Invoice #': invoice.external_bill_number || '',
      'Subcontractor': invoice.subcontractor_organization?.name || '',
      'Amount': invoice.total_amount,
      'Status': invoice.status,
      'Due Date': invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '',
      'Work Orders': invoice.subcontractor_bill_work_orders?.map(sbwo => sbwo.work_orders?.work_order_number).filter(Boolean).join(', ') || '',
      'Created': format(new Date(invoice.created_at), 'yyyy-MM-dd'),
    }));
    
    const filename = `bills-${exportFormat === 'csv' ? 'export' : 'report'}-${Date.now()}`;
    if (exportFormat === 'csv') {
      exportToCSV(exportData || [], exportColumns, filename);
    } else {
      exportToExcel(exportData || [], exportColumns, filename);
    }
    
    toast({
      title: "Export Complete",
      description: `Exported ${exportData?.length || 0} bills as ${exportFormat.toUpperCase()}`
    });
  };


  const handleBulkApprove = () => {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    ids.forEach(id => approveSubcontractorBill.mutate({ billId: id }));
    setBulkOpen(false);
    setRowSelection({});
  };

  const handleBulkReject = () => {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    ids.forEach(id => rejectSubcontractorBill.mutate({ billId: id, notes: 'Rejected via bulk action' }));
    setBulkOpen(false);
    setRowSelection({});
  };

  const handleBulkMarkPaid = () => {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id);
    const now = new Date();
    ids.forEach(id => markAsPaid.mutate({ billId: id, paymentReference: 'BULK', paymentDate: now }));
    setBulkOpen(false);
    setRowSelection({});
  };


  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil((data?.count || 0) / limit);

  return error ? (
    <div className="p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-destructive">We couldn't load bills. Please try again.</p>
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
            <BreadcrumbPage>Subcontractor Bills</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Subcontractor Bills
          </h1>
          {data?.count ? (
            <p className="text-muted-foreground">
              {data.count} total bills
            </p>
          ) : null}
          {bulkMode && (
            <p className="text-sm text-primary mt-1">
              {selectedCount} bill{selectedCount === 1 ? '' : 's'} selected
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
            onClick={() => navigate('/admin/submit-bill')} 
            className="flex-1 sm:flex-initial min-h-[44px]"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Bill</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {/* Results */}
      {isMobile ? (
        <MobilePullToRefresh onRefresh={async () => { await refetch(); }}>
          {/* Mobile toolbar */}
          <div className="bg-muted/30 border rounded-lg p-3 space-y-3 mb-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <SmartSearchInput
                placeholder="Search bills..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                storageKey="admin-invoices-search"
                className="pl-10 pr-10 h-9"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ ...filters, search: '' })}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Filter and bulk actions row */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Filters - Make filter button full width on mobile */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CompactSubcontractorBillFilters
                  value={filters}
                  onChange={handleFiltersChange}
                  onClear={handleClearFilters}
                />
              </div>

              {/* Bulk mode actions */}
              {bulkMode && selectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="shrink-0 h-9 px-3 text-xs"
                >
                  Clear ({selectedCount})
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
                title="No bills found"
                description={
                  filterCount > 0 
                    ? "No bills match your current filters."
                    : "No subcontractor bills have been submitted yet."
                }
                action={filterCount === 0 ? {
                  label: "Create Bill",
                  onClick: () => navigate('/admin/submit-bill'),
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
                     title={invoice.internal_bill_number || 'N/A'}
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
                      'Work Orders': String(invoice.subcontractor_bill_work_orders?.length || 0)
                    }}
                    actions={[
                      { label: 'View', icon: FileText, onClick: () => handleViewBill(invoice) },
                      { 
                        label: 'Approve', 
                        icon: CheckCircle, 
                        onClick: () => handleApproveBill(invoice),
                        show: canApprove
                      }
                    ]}
                    onClick={() => handleViewBill(invoice)}
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
                        approveSubcontractorBill.mutate({ billId: invoice.id });
                      } else if (canMarkPaid) {
                        markAsPaid.mutate({ billId: invoice.id, paymentReference: 'MOBILE', paymentDate: new Date() });
                      }
                    }}
                    onSwipeLeft={canApprove ? () => rejectSubcontractorBill.mutate({ billId: invoice.id, notes: 'Rejected via swipe' }) : undefined}
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
                    Bills
                  </h2>
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
                    className="shrink-0"
                  >
                    Clear Selection ({selectedCount})
                  </Button>
                )}

                {/* Filters and Search */}
                <div className="flex items-center gap-2">
                  <CompactSubcontractorBillFilters
                    value={filters}
                    onChange={handleFiltersChange}
                    onClear={handleClearFilters}
                  />
                  <div className="relative flex-1 sm:flex-initial sm:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <SmartSearchInput
                      placeholder="Search bill #, vendor, amount..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      storageKey="admin-invoices-search"
                      className="pl-10 pr-10 h-10"
                    />
                    {filters.search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({ ...filters, search: '' })}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

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
                title="No bills found"
                description={
                  filterCount > 0 
                    ? "No bills match your current filters."
                    : "No subcontractor bills have been submitted yet."
                }
                action={filterCount === 0 ? {
                  label: "Create Bill",
                  onClick: () => navigate('/admin/submit-bill'),
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
                              aria-label={`View bill ${row.original.internal_bill_number || row.original.id}`}
                              data-state={row.getIsSelected() && 'selected'}
                              className="cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                              onClick={() => {
                                const invoice = row.original;
                                handleViewBill(invoice);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  const invoice = row.original;
                                  handleViewBill(invoice);
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
                              title={invoice.internal_bill_number || 'N/A'}
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
                                'Work Orders': String(invoice.subcontractor_bill_work_orders?.length || 0)
                              }}
                              actions={[
                                { label: 'View', icon: FileText, onClick: () => handleViewBill(invoice) },
                                { 
                                  label: 'Approve', 
                                  icon: CheckCircle, 
                                  onClick: () => handleApproveBill(invoice),
                                  show: invoice.status === 'submitted'
                                }
                              ]}
                              onClick={() => handleViewBill(invoice)}
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
                                  aria-label={`Select invoice ${invoice.internal_bill_number}`}
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
          {selectedCount > 0 && (
            <span>{selectedCount} of {table.getFilteredRowModel().rows.length} {isMobile ? 'items' : 'row(s)'} selected.</span>
          )}
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
        invoice={selectedBill}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBill(null);
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
          queryClient.invalidateQueries({ queryKey: ['subcontractor-bills'] });
          refetch();
        }}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setBillToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={billToDelete?.internal_bill_number || ''}
        itemType="bill"
        isLoading={isDeleting}
      />
      </main>
    </div>
  );
}
