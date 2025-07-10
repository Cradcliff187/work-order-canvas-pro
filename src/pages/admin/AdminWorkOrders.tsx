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
import { Plus, Download, RotateCcw } from 'lucide-react';
import { useWorkOrders, useWorkOrderMutations } from '@/hooks/useWorkOrders';
import { createWorkOrderColumns } from '@/components/admin/work-orders/WorkOrderColumns';
import { WorkOrderFilters } from '@/components/admin/work-orders/WorkOrderFilters';
import { BulkActionsBar } from '@/components/admin/work-orders/BulkActionsBar';
import { CreateWorkOrderModal } from '@/components/admin/work-orders/CreateWorkOrderModal';
import { AssignWorkOrderModal } from '@/components/admin/work-orders/AssignWorkOrderModal';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { exportWorkOrders } from '@/lib/utils/export';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
  assigned_user: { first_name: string; last_name: string } | null;
};

interface WorkOrderFilters {
  status?: string[];
  trade_id?: string;
  organization_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export default function AdminWorkOrders() {
  const { toast } = useToast();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState<WorkOrderFilters>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentWorkOrders, setAssignmentWorkOrders] = useState<WorkOrder[]>([]);

  // Fetch data with server-side pagination and filtering
  const { data: workOrdersData, isLoading, error, refetch } = useWorkOrders(
    pagination,
    sorting,
    filters
  );

  const { deleteWorkOrder } = useWorkOrderMutations();

  // Column definitions with action handlers
  const columns = useMemo(() => createWorkOrderColumns({
    onEdit: (workOrder) => {
      // TODO: Navigate to edit page or open edit modal
      console.log('Edit work order:', workOrder);
    },
    onView: (workOrder) => {
      // TODO: Navigate to detail page
      console.log('View work order:', workOrder);
    },
    onDelete: (workOrder) => {
      if (confirm('Are you sure you want to delete this work order?')) {
        deleteWorkOrder.mutate(workOrder.id);
      }
    },
    onAssign: (workOrder) => {
      setAssignmentWorkOrders([workOrder]);
      setShowAssignModal(true);
    },
  }), [deleteWorkOrder]);

  // React Table configuration
  const table = useReactTable({
    data: workOrdersData?.data || [],
    columns,
    pageCount: workOrdersData?.pageCount || 0,
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
  const selectedWorkOrders = selectedRows.map(row => row.original);

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleClearSelection = () => {
    setRowSelection({});
  };

  const handleExport = (ids: string[]) => {
    try {
      const selectedData = workOrdersData?.data.filter(wo => ids.includes(wo.id));
      if (!selectedData || selectedData.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }
      
      exportWorkOrders(selectedData);
      toast({ title: `Successfully exported ${ids.length} work orders` });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export work orders. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleBulkAssign = (workOrders: WorkOrder[]) => {
    setAssignmentWorkOrders(workOrders);
    setShowAssignModal(true);
  };

  const renderTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading work orders: {error.message}</p>
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
          <h1 className="text-2xl font-bold">Work Orders Management</h1>
          <p className="text-muted-foreground">
            {workOrdersData?.totalCount ? `${workOrdersData.totalCount} total work orders` : 'Manage all work orders across organizations'}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Work Order
        </Button>
      </div>

      {/* Filters */}
      <WorkOrderFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Work Orders</CardTitle>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear Selection ({selectedRows.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              try {
                if (!workOrdersData?.data || workOrdersData.data.length === 0) {
                  toast({ title: 'No data to export', variant: 'destructive' });
                  return;
                }
                exportWorkOrders(workOrdersData.data);
                toast({ title: `Successfully exported ${workOrdersData.data.length} work orders` });
              } catch (error) {
                toast({ 
                  title: 'Export failed', 
                  description: 'Failed to export work orders. Please try again.',
                  variant: 'destructive' 
                });
              }
            }}>
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            renderTableSkeleton()
          ) : workOrdersData?.data.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No work orders found matching your criteria.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
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
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedRows.length}
        selectedIds={selectedIds}
        selectedWorkOrders={selectedWorkOrders}
        onClearSelection={handleClearSelection}
        onExport={handleExport}
        onBulkAssign={handleBulkAssign}
      />

      {/* Create Modal */}
      <CreateWorkOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Assignment Modal */}
      <AssignWorkOrderModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssignmentWorkOrders([]);
        }}
        workOrders={assignmentWorkOrders}
      />
    </div>
  );
}