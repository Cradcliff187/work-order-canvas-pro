import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { flexRender, ColumnDef, Table as ReactTable } from '@tanstack/react-table';
import { ReportStatusBadge } from '@/components/ui/status-badge';
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
  exportToolbar?: React.ReactNode;
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
  exportToolbar,
}: ReportsTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const hasRows = rows?.length > 0;

  if (isLoading) {
    return <TableSkeleton rows={5} columns={Math.max(columns.length, 5)} />;
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
    <>
      {exportToolbar && (
        <div className="flex items-center justify-end mb-3">
          {exportToolbar}
        </div>
      )}
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
            <React.Fragment key={row.id}>
              {renderMobileCard ? (
                renderMobileCard(row.original as TData)
              ) : (
                (() => {
                  const data: any = row.original;
                  const number = data?.report_number || data?.invoice_number || data?.work_orders?.work_order_number || (row.id as string) || 'Item';
                  const status = data?.status as string | undefined;
                  const amount = data?.total_amount ?? data?.invoice_amount;
                  const submittedAt = data?.submitted_at;
                  const statusOverride = status === 'submitted' ? 'bg-amber-50 text-amber-600 border-amber-200' : undefined;
                  return (
                    <MobileTableCard
                      title={number}
                      subtitle=""
                      status={status ? <ReportStatusBadge status={status} size="sm" showIcon className={statusOverride} /> : undefined}
                      onClick={() => onRowClick?.(row.original as TData)}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{typeof amount === 'number' ? `$${amount.toLocaleString()}` : 'N/A'}</span>
                      </div>
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
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4 mt-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
