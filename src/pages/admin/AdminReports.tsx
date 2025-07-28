import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  CalendarIcon, 
  Search,
  Download,
  RotateCcw,
  Filter,
  X
} from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdminReports } from '@/hooks/useAdminReports';
import { useAdminReportMutations } from '@/hooks/useAdminReportMutations';
import { useSubcontractors } from '@/hooks/useSubcontractors';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ReportFilters {
  status?: string[];
  subcontractor_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export default function AdminReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState<ReportFilters>({});

  const { data: reportsData, isLoading, error, refetch } = useAdminReports(
    pagination,
    sorting,
    filters
  );

  const { data: subcontractors } = useSubcontractors();
  const { reviewReport, bulkReviewReports } = useAdminReportMutations();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="h-5 text-[10px] px-1.5"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="h-5 text-[10px] px-1.5"><Eye className="w-3 h-3 mr-1" />Reviewed</Badge>;
      case 'approved':
        return <Badge variant="default" className="h-5 text-[10px] px-1.5"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="h-5 text-[10px] px-1.5"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="h-5 text-[10px] px-1.5">{status}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'work_orders.work_order_number',
      header: 'Work Order',
      cell: ({ row }) => {
        const workOrder = row.original.work_orders;
        return (
          <div className="font-medium">
            {workOrder?.work_order_number || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'work_orders.title',
      header: 'Title',
      cell: ({ row }) => {
        const workOrder = row.original.work_orders;
        return (
          <div className="max-w-[200px] truncate">
            {workOrder?.title || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'subcontractor',
      header: 'Subcontractor',
      cell: ({ row }) => {
        const subcontractor = row.original.subcontractor;
        const submittedBy = row.original.submitted_by;
        return (
          <div>
            <div className="font-medium">
              {subcontractor ? `${subcontractor.first_name} ${subcontractor.last_name}` : 'N/A'}
            </div>
            {submittedBy && submittedBy.user_type !== 'subcontractor' && (
              <div className="text-xs text-orange-600 font-medium">
                Submitted by {submittedBy.user_type}: {submittedBy.first_name} {submittedBy.last_name}
              </div>
            )}
            {subcontractor?.company_name && (
              <div className="text-sm text-muted-foreground">{subcontractor.company_name}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'invoice_amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.getValue('invoice_amount') as number;
        return amount ? `$${amount.toLocaleString()}` : 'N/A';
      },
    },
    {
      accessorKey: 'submitted_at',
      header: 'Submitted',
      cell: ({ row }) => {
        const date = row.getValue('submitted_at') as string;
        return format(new Date(date), 'MMM dd, yyyy');
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const report = row.original;
        const isSubmitted = report.status === 'submitted';
        
        const actions = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => navigate(`/admin/reports/${report.id}`)
          },
          {
            label: 'Approve',
            icon: CheckCircle,
            onClick: () => reviewReport.mutate({ reportId: report.id, status: 'approved' }),
            show: isSubmitted
          },
          {
            label: 'Reject',
            icon: XCircle,
            onClick: () => reviewReport.mutate({ reportId: report.id, status: 'rejected' }),
            show: isSubmitted,
            variant: 'destructive' as const
          }
        ];
        
        const reportName = `${report.work_orders?.work_order_number || 'Report'} - ${report.work_orders?.title || 'Work Order'}`;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown actions={actions} itemName={reportName} align="end" />
          </div>
        );
      },
    },
  ], [navigate, reviewReport]);

  const table = useReactTable({
    data: reportsData?.data || [],
    columns,
    pageCount: reportsData?.pageCount || 0,
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    bulkReviewReports.mutate({ reportIds: selectedIds, status: 'approved' });
    setRowSelection({});
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    bulkReviewReports.mutate({ reportIds: selectedIds, status: 'rejected' });
    setRowSelection({});
  };

  const isMobile = useIsMobile();

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading reports: {error.message}</p>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Report Review</h1>
          <p className="text-muted-foreground">
            {reportsData?.totalCount ? `${reportsData.totalCount} total reports` : 'Review and approve subcontractor reports'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status?.[0] || 'all'}
                onValueChange={(value) => 
                  handleFilterChange('status', value === 'all' ? undefined : [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subcontractor</label>
              <Select
                value={filters.subcontractor_id || 'all'}
                onValueChange={(value) => 
                  handleFilterChange('subcontractor_id', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcontractors</SelectItem>
                  {subcontractors?.map((subcontractor) => (
                    <SelectItem key={subcontractor.id} value={subcontractor.id}>
                      {subcontractor.first_name} {subcontractor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} report(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkReviewReports.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkReject}
                  disabled={bulkReviewReports.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : reportsData?.data.length === 0 ? (
            <EmptyTableState
              icon={FileText}
              title="No reports found"
              description={Object.values(filters).some(val => val && (Array.isArray(val) ? val.length > 0 : true)) ? "Try adjusting your filters or search criteria" : "Reports will appear here when subcontractors submit them"}
              colSpan={columns.length}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border">
                <Table className="admin-table">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="h-12">
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
                          data-state={row.getIsSelected() && "selected"}
                          onClick={(e) => {
                            // Don't navigate if clicking interactive elements
                            const target = e.target as HTMLElement;
                            if (target instanceof HTMLButtonElement || 
                                target instanceof HTMLInputElement ||
                                target.closest('[role="checkbox"]') ||
                                target.closest('[data-radix-collection-item]') ||
                                target.closest('.dropdown-trigger')) {
                              return;
                            }
                            navigate(`/admin/reports/${row.original.id}`);
                          }}
                          className="cursor-pointer"
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
                      <EmptyTableState
                        icon={FileText}
                        title="No reports found"
                        description="Try adjusting your filters or search criteria"
                        colSpan={columns.length}
                      />
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const report = row.original;
                    const workOrder = report.work_orders;
                    const subcontractor = report.subcontractor;
                    return (
                      <MobileTableCard
                        key={report.id}
                        title={workOrder?.work_order_number || 'N/A'}
                        subtitle={`${workOrder?.title || 'N/A'} • ${subcontractor ? `${subcontractor.first_name} ${subcontractor.last_name}` : 'N/A'}`}
                        status={getStatusBadge(report.status)}
                        onClick={() => navigate(`/admin/reports/${report.id}`)}
                      >
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">
                            {report.invoice_amount ? `$${report.invoice_amount.toLocaleString()}` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Submitted:</span>
                          <span>{format(new Date(report.submitted_at), 'MMM dd, yyyy')}</span>
                        </div>
                      </MobileTableCard>
                    );
                  })
                ) : (
                  <EmptyTableState
                    icon={FileText}
                    title="No reports found"
                    description="Try adjusting your filters or search criteria"
                    colSpan={1}
                  />
                )}
              </div>
            </>
          )}

          {/* Pagination */}
          {table.getRowModel().rows?.length > 0 && (
            <div className="flex items-center justify-between space-x-2 py-4 mt-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {selectedRows.length > 0 && (
                  <span>
                    {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}