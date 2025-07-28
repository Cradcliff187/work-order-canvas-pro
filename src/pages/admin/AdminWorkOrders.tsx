
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { Plus, Download, RotateCcw, ClipboardList, CheckSquare } from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useWorkOrders, useWorkOrderMutations, WorkOrder } from '@/hooks/useWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { createWorkOrderColumns } from '@/components/admin/work-orders/WorkOrderColumns';
import { WorkOrderFilters } from '@/components/admin/work-orders/WorkOrderFilters';
import { BulkActionsBar } from '@/components/admin/work-orders/BulkActionsBar';
import { CreateWorkOrderModal } from '@/components/admin/work-orders/CreateWorkOrderModal';
import { AssignWorkOrderModal } from '@/components/admin/work-orders/AssignWorkOrderModal';
import { WorkOrderBreadcrumb } from '@/components/admin/work-orders/WorkOrderBreadcrumb';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { exportWorkOrders } from '@/lib/utils/export';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface WorkOrderFiltersState {
  status?: string[];
  trade_id?: string;
  organization_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export default function AdminWorkOrders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState<WorkOrderFiltersState>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentWorkOrders, setAssignmentWorkOrders] = useState<WorkOrder[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  // Transform sorting state to match the hook's expected format
  const sortingFormatted = useMemo(() => ({
    sortBy: sorting.map(sort => ({ id: sort.id, desc: sort.desc }))
  }), [sorting]);

  // Fetch data with server-side pagination and filtering
  const { data: workOrdersData, isLoading, error, refetch } = useWorkOrders(
    pagination,
    sortingFormatted,
    filters
  );

  const { deleteWorkOrder } = useWorkOrderMutations();

  // Extract work order IDs for unread message counts
  const workOrderIds = workOrdersData?.data?.map(wo => wo.id) || [];
  const { data: unreadCounts = {} } = useUnreadMessageCounts(workOrderIds);

  // Column definitions with action handlers - Updated with proper type handling
  const columns = useMemo(() => createWorkOrderColumns({
    unreadCounts,
    onEdit: (workOrder: WorkOrder) => {
      navigate(`/admin/work-orders/${workOrder.id}/edit`);
    },
    onView: (workOrder: WorkOrder) => {
      navigate(`/admin/work-orders/${workOrder.id}`);
    },
    onDelete: (workOrder: WorkOrder) => {
      if (confirm('Are you sure you want to delete this work order?')) {
        deleteWorkOrder.mutate(workOrder.id);
      }
    },
    onAssign: (workOrder: WorkOrder) => {
      // Ensure the workOrder has the correct type structure
      const typedWorkOrder: WorkOrder = {
        ...workOrder,
        // Ensure organizations has the correct structure
        organizations: workOrder.organizations ? {
          id: workOrder.organizations.id,
          name: workOrder.organizations.name,
          contact_email: workOrder.organizations.contact_email,
          organization_type: workOrder.organizations.organization_type
        } : null
      };
      setAssignmentWorkOrders([typedWorkOrder]);
      setShowAssignModal(true);
    },
  }), [deleteWorkOrder, navigate, unreadCounts]);

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

  const handleBulkAssign = (ids: string[]) => {
    const workOrders = workOrdersData?.data.filter(wo => ids.includes(wo.id)) || [];
    setAssignmentWorkOrders(workOrders);
    setShowAssignModal(true);
  };


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
      {/* Breadcrumb */}
      <WorkOrderBreadcrumb />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Work Orders Management</h1>
          <p className="text-muted-foreground">
            {workOrdersData?.totalCount ? `${workOrdersData.totalCount} total work orders` : 'Manage all work orders across organizations'}
          </p>
          {bulkMode && (
            <p className="text-sm text-primary mt-1">
              Select work orders using checkboxes, then use the action bar below
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setBulkMode(!bulkMode)}
            className={bulkMode ? "border-primary text-primary" : ""}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        </div>
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
            <TableSkeleton rows={5} columns={9} />
          ) : workOrdersData?.data.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No work orders found"
              description={Object.values(filters).some(val => val && (Array.isArray(val) ? val.length > 0 : true)) ? "Try adjusting your filters or search criteria" : "Get started by creating your first work order"}
              action={{
                label: "Create Work Order",
                onClick: () => setShowCreateModal(true),
                icon: Plus
              }}
              variant="card"
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
                            navigate(`/admin/work-orders/${row.original.id}`);
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
                        icon={ClipboardList}
                        title="No work orders found"
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
                    const workOrder = row.original;
                    const getStatusVariant = (status: string) => {
                      switch (status) {
                        case 'received': return 'secondary';
                        case 'assigned': return 'default';
                        case 'in_progress': return 'outline';
                        case 'completed': return 'default';
                        case 'cancelled': return 'destructive';
                        default: return 'secondary';
                      }
                    };
                    
                    return (
                      <MobileTableCard
                        key={row.id}
                        title={workOrder.work_order_number || 'N/A'}
                        subtitle={`${workOrder.title || 'Untitled'} • ${workOrder.store_location || 'No location'}, ${workOrder.city || 'No city'}`}
                        status={
                          <Badge variant={getStatusVariant(workOrder.status)} className="h-5 text-[10px] px-1.5">
                            {workOrder.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </Badge>
                        }
                        onClick={() => navigate(`/admin/work-orders/${workOrder.id}`)}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{workOrder.trades?.name || 'No trade'}</span>
                          {workOrder.date_submitted && (
                            <span>{format(new Date(workOrder.date_submitted), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </MobileTableCard>
                    );
                  })
                ) : (
                  <EmptyTableState
                    icon={ClipboardList}
                    title="No work orders found"
                    description="Try adjusting your filters or search criteria"
                    colSpan={1}
                  />
                )}
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
        onClearSelection={handleClearSelection}
        onExport={handleExport}
        onBulkAssign={handleBulkAssign}
      />

      {/* Create Modal */}
      <CreateWorkOrderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onWorkOrderCreated={() => refetch()}
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
