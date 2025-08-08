import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table-wrapper';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { flexRender, ColumnDef, Table as ReactTable } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export interface ReceiptsTableProps<TData = any> {
  table: ReactTable<TData>;
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  viewMode: 'table' | 'card';
  onRowClick?: (row: TData) => void;
  renderMobileCard?: (row: TData) => React.ReactNode;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  onBulkCategorize?: (category: 'Materials' | 'Equipment' | 'Labor' | 'Other', ids: string[]) => void;
}

export function ReceiptsTable<TData = any>({
  table,
  columns,
  isLoading = false,
  viewMode,
  onRowClick,
  renderMobileCard,
  emptyIcon,
  emptyTitle = 'No receipts found',
  emptyDescription = 'Try adjusting your filters or search',
  onBulkCategorize,
}: ReceiptsTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const hasRows = rows?.length > 0;
  const [bulkCategory, setBulkCategory] = useState<'Materials' | 'Equipment' | 'Labor' | 'Other' | undefined>(undefined);

  const runningTotal = useMemo(() => {
    try {
      return rows.reduce((sum, r) => {
        const amt = (r.original as any)?.amount;
        return sum + (typeof amt === 'number' ? amt : 0);
      }, 0);
    } catch {
      return 0;
    }
  }, [rows]);

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
    <Card className="p-4">
      {/* Running total + bulk categorize */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          Running total: <span className="font-medium">{runningTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
        </div>
        {onBulkCategorize && table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm">Apply category:</label>
            <select
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={bulkCategory || ''}
              onChange={(e) => setBulkCategory((e.target.value || undefined) as any)}
            >
              <option value="">Select…</option>
              <option value="Materials">Materials</option>
              <option value="Equipment">Equipment</option>
              <option value="Labor">Labor</option>
              <option value="Other">Other</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              disabled={!bulkCategory}
              onClick={() => {
                const ids = table.getFilteredSelectedRowModel().rows.map((r) => (r.original as any)?.id).filter(Boolean) as string[];
                if (bulkCategory && ids.length > 0) onBulkCategorize(bulkCategory, ids);
              }}
            >
              Apply to {table.getFilteredSelectedRowModel().rows.length} selected
            </button>
          </div>
        )}
      </div>

      {viewMode === 'table' ? (
        <div className="hidden lg:block">
          <ResponsiveTableWrapper stickyFirstColumn>
            <Table className="admin-table">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-12">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
                  const data: any = row.original as any;
                  const vendor = data?.vendor_name || 'Vendor';
                  const amount = data?.amount as number | undefined;
                  const date = data?.receipt_date ? new Date(data.receipt_date) : undefined;
                  const category = data?.category as string | undefined;
                  const wo = Array.isArray(data?.work_orders) ? data.work_orders?.[0]?.work_order_number : data?.work_orders?.work_order_number;
                  return (
                    <MobileTableCard
                      title={vendor}
                      subtitle={date ? format(date, 'MMM d, yyyy') : ''}
                      onClick={() => onRowClick?.(row.original as TData)}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">{typeof amount === 'number' ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        {category ? <Badge variant="outline" className="h-5 text-[10px] px-1.5">{category}</Badge> : <span />}
                        {wo && <span className="text-muted-foreground">{wo}</span>}
                      </div>
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
    </Card>
  );
}
