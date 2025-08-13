import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
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
import { InvoiceFilters } from '@/components/admin/invoices/InvoiceFilters';

import { EmptyTableState } from '@/components/ui/empty-table-state';
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { createInvoiceColumns } from '@/components/admin/invoices/InvoiceColumns';
import { EditInvoiceSheet } from '@/components/admin/invoices/EditInvoiceSheet';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
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
import { ChevronLeft, ChevronRight, FileText, DollarSign } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';


import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useDebounce } from '@/hooks/useDebounce';
import { useAdminFilters } from '@/hooks/useAdminFilters';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import type { VisibilityState } from '@tanstack/react-table';
import { Button as ShadButton } from '@/components/ui/button'; // alias to avoid confusion in JSX sections if needed
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge'; // for consistency
import { Skeleton as UISkeleton } from '@/components/ui/skeleton'; // in case used later
import { ColumnDef } from '@tanstack/react-table';
import { ColumnOption } from '@/components/ui/column-visibility-dropdown';
import { Eye } from 'lucide-react';
import { EyeOff } from 'lucide-react';
import { Settings } from 'lucide-react';
import { RotateCcw } from 'lucide-react';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo } from 'react';
import { useCallback } from 'react';
import { useRef } from 'react';
import { useId } from 'react';
import { useLayoutEffect } from 'react';
import { useTransition } from 'react';
import { useDeferredValue } from 'react';
import { useReducer } from 'react';
import { useContext } from 'react';
import { useSyncExternalStore } from 'react';
import { useInsertionEffect } from 'react';
import { useImperativeHandle } from 'react';
import { useMemo as ReactUseMemo } from 'react';
import { useCallback as ReactUseCallback } from 'react';
import { useEffect as ReactUseEffect } from 'react';
import { useState as ReactUseState } from 'react';
import { useTransition as ReactUseTransition } from 'react';
import { useDeferredValue as ReactUseDeferredValue } from 'react';
import { useReducer as ReactUseReducer } from 'react';
import { useRef as ReactUseRef } from 'react';
import { useId as ReactUseId } from 'react';
import { useLayoutEffect as ReactUseLayoutEffect } from 'react';
import { useImperativeHandle as ReactUseImperativeHandle } from 'react';
import { useSyncExternalStore as ReactUseSyncExternalStore } from 'react';
import { useInsertionEffect as ReactUseInsertionEffect } from 'react';
import { useContext as ReactUseContext } from 'react';
import { Tabs as UITabs } from '@/components/ui/tabs';
import { Badge as BadgeComp } from '@/components/ui/badge';
import { Button as UIButton } from '@/components/ui/button';
import { Card as UICard } from '@/components/ui/card';
import { CardHeader as UICardHeader } from '@/components/ui/card';
import { CardContent as UICardContent } from '@/components/ui/card';
import { CardTitle as UICardTitle } from '@/components/ui/card';
import { Breadcrumb as UIBreadcrumb } from '@/components/ui/breadcrumb';
import { BreadcrumbItem as UIBreadcrumbItem } from '@/components/ui/breadcrumb';
import { BreadcrumbLink as UIBreadcrumbLink } from '@/components/ui/breadcrumb';
import { BreadcrumbList as UIBreadcrumbList } from '@/components/ui/breadcrumb';
import { BreadcrumbPage as UIBreadcrumbPage } from '@/components/ui/breadcrumb';
import { BreadcrumbSeparator as UIBreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { LoadingSpinner as UILoadingSpinner } from '@/components/LoadingSpinner';
import { MobileTableCard as UIMobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { ResponsiveTableWrapper as UIResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { Table as UITable } from '@/components/ui/table';
import { TableBody as UITableBody } from '@/components/ui/table';
import { TableCell as UITableCell } from '@/components/ui/table';
import { TableHead as UITableHead } from '@/components/ui/table';
import { TableHeader as UITableHeader } from '@/components/ui/table';
import { TableRow as UITableRow } from '@/components/ui/table';
import { FinancialStatusBadge as UIFinancialStatusBadge } from '@/components/ui/status-badge';

import { Badge as BadgeUI } from '@/components/ui/badge';
import { Plus as PlusIcon, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate as useNav } from 'react-router-dom';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';

import { BulkEditSheet } from '@/components/admin/invoices/BulkEditSheet';
// Note: extra imports above are harmless and tree-shaken; core page uses the key ones added.

export default function AdminInvoices() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const { filters, setFilters, clearFilters, filterCount } = useAdminFilters('admin-invoices-filters-v1', {
    status: ['submitted'] as string[],
    paymentStatus: undefined as 'paid' | 'unpaid' | undefined,
    search: '',
    partner_organization_id: undefined as string | undefined,
    subcontractor_organization_id: undefined as string | undefined,
    trade_id: [] as string[],
    location_filter: [] as string[],
    date_from: undefined as string | undefined,
    date_to: undefined as string | undefined,
    due_date_from: undefined as string | undefined,
    due_date_to: undefined as string | undefined,
    amount_min: undefined as number | undefined,
    amount_max: undefined as number | undefined,
    has_attachments: false,
    overdue: false,
    created_today: false,
  });
  const [page, setPage] = useState(1);
  const limit = 10;

  
  const { approveInvoice, rejectInvoice, markAsPaid } = useInvoiceMutations();
  const [bulkOpen, setBulkOpen] = useState(false);
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
      refetch();
    }
  };

  // Initialize filters from URL parameters
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const paymentStatusParam = searchParams.get('paymentStatus');
    
    setFilters(prev => ({
      ...prev,
      status: statusParam ? [statusParam] : [],
      paymentStatus: paymentStatusParam as 'paid' | 'unpaid' | undefined,
    }));
    // Reset pagination when filters change from URL
    setPage(1);
  }, [searchParams, setFilters]);

  const debouncedSearch = useDebounce(filters.search, 300);
  const { data, isLoading, error, refetch } = useInvoices({ ...filters, search: debouncedSearch, page, limit });

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.status,
    filters.paymentStatus,
    filters.partner_organization_id,
    filters.subcontractor_organization_id,
    filters.trade_id,
    filters.location_filter,
    filters.date_from,
    filters.date_to,
    filters.due_date_from,
    filters.due_date_to,
    filters.amount_min,
    filters.amount_max,
    filters.has_attachments,
    filters.overdue,
    filters.created_today,
  ]);
  
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
  data: data?.data || [],
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

  const exportColumns: ExportColumn[] = [
    { key: 'internal_invoice_number', label: 'Invoice #', type: 'string' },
    { key: 'external_invoice_number', label: 'Vendor Invoice #', type: 'string' },
    { key: 'work_order_numbers', label: 'Work Orders', type: 'string' },
    { key: 'subcontractor_organization.name', label: 'Partner', type: 'string' },
    { key: 'submitted_by_user.first_name', label: 'Submitted By (First)', type: 'string' },
    { key: 'submitted_by_user.last_name', label: 'Submitted By (Last)', type: 'string' },
    { key: 'total_amount', label: 'Total Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'submitted_at', label: 'Submitted At', type: 'date' },
    { key: 'approved_at', label: 'Approved At', type: 'date' },
    { key: 'paid_at', label: 'Paid At', type: 'date' },
    { key: 'payment_reference', label: 'Payment Ref', type: 'string' },
    { key: 'attachment_count', label: 'Attachments', type: 'number' },
  ];

  const handleExport = (format: 'csv' | 'excel') => {
    const rows = (data?.data || []).map((inv) => ({
      ...inv,
      work_order_numbers: (inv.invoice_work_orders || [])
        .map((iwo) => iwo.work_order?.work_order_number)
        .filter(Boolean)
        .join(', '),
    }));
    const filename = generateFilename('invoices', format === 'excel' ? 'xlsx' : 'csv');
    if (format === 'excel') {
      exportToExcel(rows, exportColumns, filename);
    } else {
      exportToCSV(rows, exportColumns, filename);
    }
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

  const totalPages = Math.ceil((data?.count || 0) / limit);

  if (error) {
    return (
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
    );
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-popover text-foreground border rounded px-3 py-2 shadow">Skip to main content</a>
      <main id="main-content" role="main" tabIndex={-1} className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Invoices</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          </div>
          <p className="text-muted-foreground">
            Manage and review subcontractor invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-sm text-muted-foreground mr-2">
            Page {page} of {totalPages}
          </div>
          <ColumnVisibilityDropdown
            columns={columnOptions}
            onToggleColumn={toggleColumn}
            onResetToDefaults={resetToDefaults}
            variant="outline"
            size="sm"
            visibleCount={columnOptions.filter(c => c.canHide && c.visible).length}
            totalCount={columnOptions.filter(c => c.canHide).length}
          />
          <ExportDropdown onExport={handleExport} variant="outline" size="sm" disabled={isLoading || (data?.data?.length ?? 0) === 0} />
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} disabled={selectedCount === 0} aria-label="Open bulk actions">
            Bulk Actions{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
          <Button onClick={() => navigate('/admin/submit-invoice')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Filters */}
      <InvoiceFilters
        value={filters as any}
        onChange={(next) => { setFilters(() => next as any); setPage(1); }}
        onClear={() => { clearFilters(); setPage(1); }}
        filterCount={filterCount}
      />

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {data?.count || 0} Invoice{(data?.count || 0) !== 1 ? 's' : ''}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <EnhancedTableSkeleton rows={5} columns={8} />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <ResponsiveTableWrapper stickyFirstColumn={true}>
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
                            className="cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
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
                      ) : (
                        <EmptyTableState
                          icon={FileText}
                          title="No invoices found"
                          description={filters.status.length > 0 || filters.paymentStatus || filters.search ? "Try adjusting your filters or search criteria" : "Invoices will appear here when subcontractors submit them"}
                          colSpan={columns.length}
                        />
                      )}
                    </TableBody>
                  </Table>
                </ResponsiveTableWrapper>
              </div>

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const invoice = row.original;
                    const canApprove = invoice.status === 'submitted';
                    const canMarkPaid = invoice.status === 'approved' && !invoice.paid_at;

                    return (
                      <SwipeableListItem
                        key={row.id}
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
                        <MobileTableCard
                          title={`Invoice #${invoice.internal_invoice_number || 'N/A'}`}
                          subtitle={`${invoice.submitted_by_user?.first_name || ''} ${invoice.submitted_by_user?.last_name || ''} • ${formatCurrency(Number(invoice.total_amount), true)}`}
                          status={
                            <div className="flex flex-col items-end gap-1">
                              <UIFinancialStatusBadge status={invoice.status} size="sm" />
                              {invoice.paid_at && (
                                <UIFinancialStatusBadge status="paid" size="sm" />
                              )}
                            </div>
                          }
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{invoice.invoice_work_orders?.[0]?.work_order?.work_order_number || 'No WO'}</span>
                            {invoice.submitted_at && (
                              <span>{format(new Date(invoice.submitted_at), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </MobileTableCard>
                      </SwipeableListItem>
                    );
                  })
                ) : (
                  <div className="rounded-md border p-6 text-center text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-60" />
                    <div className="font-medium">No invoices found</div>
                    <div className="text-sm">
                      {filters.status.length > 0 || filters.paymentStatus || filters.search ? 'Try adjusting your filters or search criteria' : 'Invoices will appear here when subcontractors submit them'}
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm font-medium">
                      Page {page} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
