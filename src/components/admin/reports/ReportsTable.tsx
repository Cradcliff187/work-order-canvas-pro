
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { flexRender, ColumnDef, Table as ReactTable, RowSelectionState } from '@tanstack/react-table';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { format } from 'date-fns';
import { formatDate } from '@/lib/utils/date';

export interface ReportsTableProps<TData = any> {
  table: ReactTable<TData>;
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  viewMode: 'table' | 'card';
  onRowClick?: (row: TData) => void;
  renderMobileCard?: (row: TData) => React.ReactNode;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  // Column visibility props
  columnVisibilityColumns?: Array<{
    id: string;
    label: string;
    description?: string;
    visible: boolean;
    canHide: boolean;
  }>;
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
  // Export props
  onExportAll?: (format: 'csv' | 'excel') => void;
  onExport?: (format: 'csv' | 'excel', ids: string[]) => void;
  // Selection props
  rowSelection?: RowSelectionState;
  onClearSelection?: () => void;
  // Mobile props
  isMobile?: boolean;
  // Data props for pagination display
  totalCount?: number;
}

export function ReportsTable<TData = any>({
  table,
  columns,
  isLoading = false,
  viewMode,
  onRowClick,
  renderMobileCard,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyDescription = 'Try adjusting your filters or search criteria',
  columnVisibilityColumns,
  onToggleColumn,
  onResetColumns,
  onExportAll,
  onExport,
  rowSelection,
  onClearSelection,
  isMobile = false,
  totalCount,
}: ReportsTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const hasRows = rows?.length > 0;
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => (row.original as any).id);

  if (isLoading) {
    return <EnhancedTableSkeleton rows={5} columns={Math.max(columns.length, 5)} />;
  }

  if (!hasRows) {
    return (
      <EmptyTableState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        colSpan={viewMode === 'table' ? columns.length : 1}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Reports</CardTitle>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && onClearSelection && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearSelection}
              aria-label={`Clear selection of ${selectedRows.length} reports`}
            >
              Clear Selection ({selectedRows.length})
            </Button>
          )}
          {!isMobile && columnVisibilityColumns && onToggleColumn && onResetColumns && (
            <ColumnVisibilityDropdown
              columns={columnVisibilityColumns}
              onToggleColumn={onToggleColumn}
              onResetToDefaults={onResetColumns}
              variant="outline"
              size="sm"
            />
          )}
          {!isMobile && onExportAll && (
            <ExportDropdown
              onExport={onExportAll}
              variant="outline"
              size="sm"
              disabled={isLoading || !hasRows}
              loading={isLoading}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'table' ? (
          <div className="hidden lg:block">
            <ResponsiveTableWrapper stickyFirstColumn>
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
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target instanceof HTMLButtonElement ||
                          target instanceof HTMLInputElement ||
                          target.closest('[role="checkbox"]') ||
                          target.closest('[data-radix-collection-item]') ||
                          target.closest('.dropdown-trigger')
                        ) {
                          return;
                        }
                        onRowClick?.(row.original as TData);
                      }}
                      className={onRowClick ? 'cursor-pointer' : ''}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableWrapper>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id}>
                {renderMobileCard ? (
                  renderMobileCard(row.original as TData)
                ) : (
                  (() => {
                    const data: any = row.original;
                    const number = data?.report_number || data?.invoice_number || data?.work_orders?.work_order_number || (row.id as string) || 'Item';
                    const status = data?.status as string | undefined;
                    
                    const submittedAt = data?.submitted_at;
                    const statusOverride = status === 'submitted' ? 'bg-amber-50 text-amber-600 border-amber-200' : undefined;
                    return (
                      <MobileTableCard
                        title={number}
                        subtitle=""
                        status={status ? <ReportStatusBadge status={status} size="sm" showIcon className={statusOverride} /> : undefined}
                        onClick={() => onRowClick?.(row.original as TData)}
                      >
                        {submittedAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Submitted:</span>
                            <span>{formatDate(submittedAt)}</span>
                          </div>
                        )}
                      </MobileTableCard>
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Pagination */}
        <div className={`flex items-center py-4 mt-4 ${isMobile ? 'flex-col space-y-4' : 'justify-between space-x-2'}`}>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {totalCount || table.getFilteredRowModel().rows.length} {isMobile ? 'items' : 'reports'}
            </div>
            {!isMobile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
      </CardContent>
    </Card>
  );
}
