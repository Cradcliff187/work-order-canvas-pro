import React, { useState, useEffect } from 'react';
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
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
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
import { FinancialStatusBadge } from '@/components/ui/status-badge';
import { useSubmittedCounts } from '@/hooks/useSubmittedCounts';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { useDebounce } from '@/hooks/useDebounce';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
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
import { useSubmittedCounts as useSubmittedCountsHook } from '@/hooks/useSubmittedCounts';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Plus as PlusIcon, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate as useNav } from 'react-router-dom';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';
import { QuickFiltersBar } from '@/components/admin/invoices/QuickFiltersBar';
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
  const [filters, setFilters] = useState({
    status: ['submitted'] as string[], // Default to showing submitted invoices first
    paymentStatus: undefined as 'paid' | 'unpaid' | undefined,
    search: '',
    page: 1,
    limit: 10,
  });

  // Persist filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin-invoices-filters-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setFilters(prev => ({
          ...prev,
          status: Array.isArray(parsed?.status) ? parsed.status : (parsed?.status ? [parsed.status] : []),
          paymentStatus: parsed?.paymentStatus,
          search: parsed?.search || '',
          page: parsed?.page || 1,
        }));
      }
    } catch (e) {
      console.warn('Failed to parse invoices filters', e);
    }
  }, []);

  useEffect(() => {
    try {
      const payload = { status: filters.status, paymentStatus: filters.paymentStatus, search: filters.search, page: filters.page };
      localStorage.setItem('admin-invoices-filters-v1', JSON.stringify(payload));
    } catch {}
  }, [filters.status, filters.paymentStatus, filters.search, filters.page]);
  
  const { approveInvoice, rejectInvoice, markAsPaid } = useInvoiceMutations();
  const [bulkOpen, setBulkOpen] = useState(false);

  // Initialize filters from URL parameters
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const paymentStatusParam = searchParams.get('paymentStatus');
    
    setFilters(prev => ({
      ...prev,
      status: statusParam ? [statusParam] : [],
      paymentStatus: paymentStatusParam as 'paid' | 'unpaid' | undefined,
    }));
  }, [searchParams]);

  const debouncedSearch = useDebounce(filters.search, 300);
  const { data, isLoading, error, refetch } = useInvoices({ ...filters, search: debouncedSearch });
  const { data: submittedCounts } = useSubmittedCounts();
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
  });

  // Column visibility setup for invoices
  const columnMetadata = {
    select: { label: 'Select', defaultVisible: true },
    internal_invoice_number: { label: 'Invoice #', defaultVisible: true },
    external_invoice_number: { label: 'Vendor Invoice #', defaultVisible: true },
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
    canHide: c.id !== 'select' && c.id !== 'actions',
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
  const quickCounts = { submitted: submittedCounts?.invoicesCount ?? 0 } as Partial<Record<'submitted' | 'approved' | 'paid' | 'rejected', number>>;

  const exportColumns: ExportColumn[] = [
    { key: 'internal_invoice_number', label: 'Invoice #', type: 'string' },
    { key: 'external_invoice_number', label: 'Vendor Invoice #', type: 'string' },
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
    const rows = data?.data || [];
    const filename = generateFilename('invoices', format === 'excel' ? 'xlsx' : 'csv');
    if (format === 'excel') {
      exportToExcel(rows, exportColumns, filename);
    } else {
      exportToCSV(rows, exportColumns, filename);
    }
  };

  const handleQuickFilter = (key: 'submitted' | 'approved' | 'paid' | 'rejected') => {
    setFilters(prev => ({ ...prev, status: [key], page: 1, paymentStatus: key === 'paid' ? 'paid' : prev.paymentStatus }));
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

  const handleStatusChange = (status: string[]) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handlePaymentStatusChange = (paymentStatus?: 'paid' | 'unpaid') => {
    setFilters(prev => ({ ...prev, paymentStatus, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: [],
      paymentStatus: undefined,
      search: '',
      page: 1,
      limit: 10,
    });
    try {
      localStorage.removeItem('admin-invoices-filters-v1');
      localStorage.removeItem('admin-invoices-search');
    } catch {}
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const totalPages = Math.ceil((data?.count || 0) / filters.limit);

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
    <div className="space-y-6">
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
            {submittedCounts && submittedCounts.invoicesCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                {submittedCounts.invoicesCount} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage and review subcontractor invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-sm text-muted-foreground mr-2">
            Page {filters.page} of {totalPages}
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

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {data?.count || 0} Invoice{(data?.count || 0) !== 1 ? 's' : ''}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Page {filters.page} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick filters + search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
            <QuickFiltersBar onQuickFilter={handleQuickFilter} counts={quickCounts} />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <SmartSearchInput
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onSearchSubmit={(q) => handleSearchChange(q)}
                placeholder="Search invoices..."
                className="w-full md:w-80"
                storageKey="admin-invoices-search"
              />
              <Button variant="outline" size="sm" onClick={handleClearFilters} aria-label="Clear all filters">
                Clear Filters
              </Button>
            </div>
          </div>
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
                            data-state={row.getIsSelected() && 'selected'}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              const invoice = row.original;
                              handleViewInvoice(invoice);
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
                              <FinancialStatusBadge status={invoice.status} size="sm" />
                              {invoice.paid_at && (
                                <FinancialStatusBadge status="paid" size="sm" />
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
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={filters.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm font-medium">
                      Page {filters.page} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page + 1)}
                      disabled={filters.page >= totalPages}
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
    </div>
  );
}