import { useMemo } from 'react';
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
  VisibilityState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { Plus, ClipboardList, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/admin/shared/TablePagination';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { EmptyState } from '@/components/ui/empty-state';
import { WorkOrder } from '@/hooks/useWorkOrders';
import { MobileWorkOrderCard } from '@/components/MobileWorkOrderCard';
import { CompactMobileCard } from '@/components/admin/shared/CompactMobileCard';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { MasterDetailLayout } from '@/components/work-orders/MasterDetailLayout';
import { WorkOrderDetailPanel } from '@/components/work-orders/WorkOrderDetailPanel';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { cn } from '@/lib/utils';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { useToast } from '@/hooks/use-toast';
import { exportWorkOrders } from '@/lib/utils/export';

interface WorkOrderTableProps {
  // Data
  data: WorkOrder[] | undefined;
  totalCount?: number;
  pageCount: number;
  isLoading: boolean;
  
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Table Configuration
  columns: ColumnDef<WorkOrder>[];
  pagination: PaginationState;
  setPagination: (pagination: PaginationState) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState) => void;
  columnVisibility?: VisibilityState;
  setColumnVisibility?: (visibility: VisibilityState) => void;
  columnVisibilityColumns?: Array<{
    id: string;
    label: string;
    description?: string;
    visible: boolean;
    canHide: boolean;
  }>;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  
  // View Configuration
  viewMode: 'table' | 'card' | 'list';
  allowedModes: ('table' | 'card' | 'list')[];
  setViewMode: (mode: 'table' | 'card' | 'list') => void;
  bulkMode: boolean;
  useCompactCards: boolean;
  
  // Master-Detail (for table view)
  selectedWorkOrderId: string | null;
  setSelectedWorkOrderId: (id: string | null) => void;
  selectedWorkOrder?: WorkOrder;
  isLoadingDetail: boolean;
  
  // Callbacks
  onWorkOrderClick: (workOrder: WorkOrder) => void;
  onEdit: (workOrder: WorkOrder) => void;
  onViewDetails: (workOrder: WorkOrder) => void;
  onMessage: (workOrder: WorkOrder) => void;
  onExportAll: (format: 'csv' | 'excel') => void;
  onExport: (format: 'csv' | 'excel', ids: string[]) => void;
  onClearSelection: () => void;
  onCreateNew: () => void;
  
  // Mobile specific
  isMobile: boolean;
  onRefresh?: () => Promise<void>;
  refreshThreshold?: number;
  
  // Visual feedback for optimistic updates
  updatingRowIds?: Set<string>;
}

export function WorkOrderTable({
  data,
  totalCount,
  pageCount,
  isLoading,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search WO#, title, or location...",
  columns,
  pagination,
  setPagination,
  sorting,
  setSorting,
  rowSelection,
  setRowSelection,
  columnVisibility,
  setColumnVisibility,
  columnVisibilityColumns,
  onToggleColumn,
  onResetColumns,
  viewMode,
  allowedModes,
  setViewMode,
  bulkMode,
  useCompactCards,
  selectedWorkOrderId,
  setSelectedWorkOrderId,
  selectedWorkOrder,
  isLoadingDetail,
  onWorkOrderClick,
  onEdit,
  onViewDetails,
  onMessage,
  onExportAll,
  onExport,
  onClearSelection,
  onCreateNew,
  isMobile,
  onRefresh,
  refreshThreshold = 60,
  updatingRowIds
}: WorkOrderTableProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // React Table configuration
  const table = useReactTable({
    data: data || [],
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
      rowSelection,
      columnVisibility,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);

  // Handle work order row click for master-detail
  const handleWorkOrderRowClick = (workOrder: WorkOrder) => {
    if (viewMode === 'table' && !isMobile) {
      setSelectedWorkOrderId(workOrder.id);
    } else {
      onWorkOrderClick(workOrder);
    }
  };

  // Render mobile view
  if (isMobile) {
    return (
      <MobilePullToRefresh onRefresh={onRefresh} threshold={refreshThreshold}>
        <div className="space-y-4">
          {bulkMode && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={selectedIds.length === 0}
                aria-label={`Clear selection (${selectedIds.length} selected)`}
              >
                <span className="hidden sm:inline">Clear Selection</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            </div>
          )}

          {!data?.length ? (
            <EmptyState
              icon={ClipboardList}
              title="No work orders found"
              description={totalCount === 0 
                ? "No work orders have been created yet. Create your first work order to get started."
                : "No work orders match your current filters. Try adjusting your search criteria."
              }
              action={totalCount === 0 ? {
                label: "Create Work Order",
                onClick: onCreateNew,
                icon: Plus
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {table.getRowModel().rows.map((row) => {
                const workOrder = row.original;
                // Transform the work order data to match MobileWorkOrderCard's expected format
                const transformedWorkOrder = {
                  ...workOrder,
                  work_order_assignments: workOrder.work_order_assignments?.map(assignment => ({
                    assigned_to: assignment.assigned_to,
                    assignment_type: assignment.assignment_type,
                    assignee_profile: {
                      first_name: assignment.profiles?.first_name || '',
                      last_name: assignment.profiles?.last_name || ''
                    },
                    assigned_organization: assignment.organizations ? {
                      name: assignment.organizations.name,
                      organization_type: 'partner' as const
                    } : undefined
                  })) || []
                };

                if (bulkMode) {
                  return (
                    <div key={row.original.id} className="relative">
                      <MobileWorkOrderCard
                        workOrder={transformedWorkOrder}
                        onTap={() => onWorkOrderClick(row.original)}
                        viewerRole="admin"
                        className="max-w-full"
                        showOrganization={true}
                        showAssignee={true}
                        showTrade={true}
                        showDaysOld={true}
                      />
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 scale-125"
                          aria-label={`Select work order ${workOrder.work_order_number || workOrder.title}`}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <MobileWorkOrderCard
                    key={row.original.id}
                    workOrder={transformedWorkOrder}
                    onTap={() => onWorkOrderClick(row.original)}
                    viewerRole="admin"
                    className="max-w-full"
                    showOrganization={true}
                    showAssignee={true}
                    showTrade={true}
                    showDaysOld={true}
                    showQuickActions={true}
                    onMessage={() => onMessage(row.original)}
                    onViewDetails={() => onViewDetails(row.original)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </MobilePullToRefresh>
    );
  }

  // Render desktop view
  return (
    <Card>
      {/* Table toolbar with search and actions */}
      <div className="border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          {/* Left side - Title and view mode */}
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Work Orders
              </h2>
              {totalCount !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCount} total work orders
                </p>
              )}
            </div>
            
            {/* View mode switcher */}
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
            {selectedRows.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearSelection}
                className="shrink-0"
              >
                Clear Selection ({selectedRows.length})
              </Button>
            )}

            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10 h-10"
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Column visibility */}
            {columnVisibilityColumns && onToggleColumn && onResetColumns && (
              <ColumnVisibilityDropdown
                columns={columnVisibilityColumns}
                onToggleColumn={onToggleColumn}
                onResetToDefaults={onResetColumns}
                variant="outline"
                size="sm"
              />
            )}

            {/* Export */}
            <ExportDropdown
              onExport={onExportAll}
              variant="outline"
              size="sm"
              disabled={isLoading || !(data && data.length > 0)}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
      <CardContent>
        {isLoading ? (
          <EnhancedTableSkeleton rows={5} columns={9} />
        ) : data?.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No work orders found"
            description="Try adjusting your filters or search criteria"
            action={{
              label: "Create Work Order",
              onClick: onCreateNew,
              icon: Plus
            }}
            variant="card"
          />
        ) : (
          <>
            {/* Table View (Desktop Master-Detail) */}
            {viewMode === 'table' && (
              <div className="hidden lg:block">
                <MasterDetailLayout
                  listContent={
                    <ResponsiveTableWrapper stickyFirstColumn={true}>
                      <Table className="admin-table" aria-label="Work orders data table">
                        <TableHeader>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <TableHead 
                                  key={header.id} 
                                  className={cn(
                                    "h-12",
                                    (header.column.columnDef.meta as any)?.className
                                  )} 
                                  scope="col"
                                >
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
                                className={cn(
                                  "cursor-pointer hover:bg-muted/50",
                                  selectedWorkOrderId === row.original.id && "bg-muted",
                                  updatingRowIds?.has(row.original.id) && "opacity-50 pointer-events-none"
                                )}
                                onClick={() => handleWorkOrderRowClick(row.original)}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell 
                                    key={cell.id} 
                                    className={cn(
                                      "py-3",
                                      (cell.column.columnDef.meta as any)?.className
                                    )}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={columns.length} className="h-24 text-center">
                            <EmptyTableState 
                              title="No work orders found"
                              description="Try adjusting your filters or search criteria"
                              colSpan={columns.length}
                            />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ResponsiveTableWrapper>
                  }
                  selectedId={selectedWorkOrderId}
                  onSelectionChange={setSelectedWorkOrderId}
                  detailContent={
                    selectedWorkOrder && (
                      <WorkOrderDetailPanel
                        workOrder={selectedWorkOrder as any}
                        onEdit={() => onEdit(selectedWorkOrder)}
                        onViewFull={() => onViewDetails(selectedWorkOrder)}
                      />
                    )
                  }
                  isLoading={isLoadingDetail}
                  items={data || []}
                />
              </div>
            )}

            {/* Card View (Desktop Grid) */}
            {viewMode === 'card' && (
              <div className="hidden lg:block">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {table.getRowModel().rows.map((row) => {
                    const workOrder = row.original;
                    
                    if (useCompactCards) {
                      return (
                        <div key={row.original.id} className="relative">
                          <CompactMobileCard
                            title={workOrder.title || 'Untitled Work Order'}
                            subtitle={workOrder.organizations?.name || 'No Organization'}
                            badge={<WorkOrderStatusBadge status={workOrder.status} workOrder={workOrder} />}
                            onClick={() => handleWorkOrderRowClick(workOrder)}
                          />
                        </div>
                      );
                    }
                    
                    // Transform the work order data to match MobileWorkOrderCard's expected format
                    const transformedWorkOrder = {
                      ...workOrder,
                      work_order_assignments: workOrder.work_order_assignments?.map(assignment => ({
                        assigned_to: assignment.assigned_to,
                        assignment_type: assignment.assignment_type,
                        assignee_profile: {
                          first_name: assignment.profiles?.first_name || '',
                          last_name: assignment.profiles?.last_name || ''
                        },
                        assigned_organization: assignment.organizations ? {
                          name: assignment.organizations.name,
                          organization_type: 'partner' as const
                        } : undefined
                      })) || []
                    };

                    if (bulkMode) {
                      return (
                        <div key={row.original.id} className="relative">
                          <MobileWorkOrderCard
                            workOrder={transformedWorkOrder}
                            onTap={() => handleWorkOrderRowClick(workOrder)}
                            viewerRole="admin"
                            className="max-w-full"
                            showOrganization={true}
                            showAssignee={true}
                            showTrade={true}
                            showDaysOld={true}
                          />
                          <div className="absolute top-2 right-2">
                            <input
                              type="checkbox"
                              checked={row.getIsSelected()}
                              onChange={row.getToggleSelectedHandler()}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-gray-300 scale-125"
                            />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <MobileWorkOrderCard
                        key={row.original.id}
                        workOrder={transformedWorkOrder}
                        onTap={() => handleWorkOrderRowClick(workOrder)}
                        viewerRole="admin"
                        className="max-w-full"
                        showOrganization={true}
                        showAssignee={true}
                        showTrade={true}
                        showDaysOld={true}
                        showQuickActions={true}
                        onMessage={() => onMessage(workOrder)}
                        onViewDetails={() => onViewDetails(workOrder)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination */}
            <TablePagination
              table={table}
              totalCount={totalCount}
              itemName="work orders"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}