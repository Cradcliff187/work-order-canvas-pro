import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/admin/shared/TableSkeleton";
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table-wrapper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FinancialStatusBadge } from "@/components/ui/status-badge";

export interface InvoicesTableProps<TData = any> {
  data?: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  // Billing helpers
  getDueDate?: (row: TData) => string | null;
  getAmount?: (row: TData) => number;
  getIsPaid?: (row: TData) => boolean;
  renderMobileCard?: (row: TData) => React.ReactNode;
}

export function InvoicesTable<TData = any>({
  data = [],
  columns,
  isLoading = false,
  emptyState,
  getDueDate,
  getAmount,
  getIsPaid,
  renderMobileCard,
}: InvoicesTableProps<TData>) {
  const table = useReactTable({
    data: data as TData[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { totalOutstanding, totalOverdue } = useMemo(() => {
    const now = new Date();
    let outstanding = 0;
    let overdue = 0;
    (data || []).forEach((row: any) => {
      const amount = getAmount ? getAmount(row) : Number(row?.total_amount ?? 0);
      const isPaid = getIsPaid ? getIsPaid(row) : !!row?.paid_at;
      if (!isPaid) {
        outstanding += amount;
        const due = getDueDate ? getDueDate(row) : (row as any)?.due_date ?? null;
        if (due && new Date(due) < now) {
          overdue += amount;
        }
      }
    });
    return { totalOutstanding: outstanding, totalOverdue: overdue };
  }, [data, getAmount, getDueDate, getIsPaid]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <TableSkeleton rows={8} columns={6} />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {emptyState ?? "No invoices found."}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className="font-medium">${'{'}totalOutstanding.toLocaleString(undefined, { style: 'currency', currency: 'USD' }){'}'}</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className="text-lg font-semibold">
            {totalOutstanding.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Overdue</div>
          <div className="text-lg font-semibold text-destructive">
            {totalOverdue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <ResponsiveTableWrapper stickyFirstColumn minWidth={960}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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

      {/* Mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {(data as any[]).map((row, idx) => {
          if (renderMobileCard) return <React.Fragment key={idx}>{renderMobileCard(row)}</React.Fragment>;
          const amount = getAmount ? getAmount(row) : Number(row?.total_amount ?? 0);
          const isPaid = getIsPaid ? getIsPaid(row) : !!row?.paid_at;
          const due = getDueDate ? getDueDate(row) : (row as any)?.due_date ?? null;
          const overdue = due ? new Date(due) < new Date() && !isPaid : false;
          return (
            <div key={idx} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium truncate">{(row as any)?.internal_invoice_number}</div>
                <div className={`text-base font-semibold ${overdue ? 'text-destructive' : ''}`}>
                  {amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="truncate text-muted-foreground">{(row as any)?.subcontractor_organization?.name}</div>
                <FinancialStatusBadge status={overdue ? 'overdue' : ((row as any)?.status ?? 'pending')} size="sm" showIcon={false} />
              </div>
              <div className="text-xs text-muted-foreground">
                {due ? `Due ${new Date(due).toLocaleDateString()}` : 'No due date'}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default InvoicesTable;
