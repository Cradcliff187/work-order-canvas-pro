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
import { InvoiceDetailModal } from '@/components/admin/invoices/InvoiceDetailModal';
import { createInvoiceColumns } from '@/components/admin/invoices/InvoiceColumns';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminInvoices() {
  const [searchParams] = useSearchParams();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState({
    status: [] as string[],
    paymentStatus: undefined as 'paid' | 'unpaid' | undefined,
    search: '',
    page: 1,
    limit: 10,
  });

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

  const { data, isLoading, error } = useInvoices(filters);

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

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

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
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const totalPages = Math.ceil((data?.count || 0) / filters.limit);

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-red-500">
          Error loading invoices: {error.message}
        </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and review subcontractor invoices
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceFilters
            status={filters.status}
            paymentStatus={filters.paymentStatus}
            search={filters.search}
            onStatusChange={handleStatusChange}
            onPaymentStatusChange={handlePaymentStatusChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
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
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No invoices found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
    </div>
  );
}