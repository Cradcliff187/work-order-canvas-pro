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
import { InvoiceFilters } from '@/components/admin/invoices/InvoiceFilters';
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
import { ChevronLeft, ChevronRight, FileText, DollarSign, Plus, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatting';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { Badge } from '@/components/ui/badge';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';

import { useAdminFilters } from '@/hooks/useAdminFilters';
import { useInvoiceMutations } from '@/hooks/useInvoiceMutations';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { StatusBadge } from '@/components/ui/status-badge';
import type { VisibilityState } from '@tanstack/react-table';

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
            <BreadcrumbPage>Subcontractor Invoices</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Subcontractor Invoices</h1>
          </div>
          <p className="text-muted-foreground">
            Manage and review subcontractor invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        onChange={(next) => {
          // Guard against same value updates
          if (JSON.stringify(filters) === JSON.stringify(next)) {
            console.log('⚠️ Filter unchanged, skipping');
            return;
          }
          
          setFilters(next as any);
          setPage(1);
        }}
        onClear={() => { 
          clearFilters(); 
          setPage(1); 
        }}
        filterCount={filterCount}
      />

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {data?.totalCount || 0} Invoice{(data?.totalCount || 0) !== 1 ? 's' : ''}
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
                          title="No subcontractor invoices found"
                          description={filters.invoice_status?.length > 0 || filters.search ? "Try adjusting your filters or search criteria" : "Subcontractor invoices will appear here when submitted"}
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
                          subtitle={`${invoice.subcontractor_organization?.name || 'Unknown Organization'} • ${formatCurrency(Number(invoice.total_amount), true)}`}
                          status={
                            <div className="flex flex-col items-end gap-1">
                              <StatusBadge type="financialStatus" status={invoice.status} size="sm" />
                              {invoice.paid_at && (
                                <StatusBadge type="financialStatus" status="paid" size="sm" />
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
                    <div className="font-medium">No subcontractor invoices found</div>
                    <div className="text-sm">
                      {filters.invoice_status?.length > 0 || filters.search ? 'Try adjusting your filters or search criteria' : 'Subcontractor invoices will appear here when submitted'}
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
