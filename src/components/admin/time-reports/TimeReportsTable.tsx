import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/enhanced-skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { flexRender, getCoreRowModel, useReactTable, ColumnDef } from '@tanstack/react-table';
import { TimeReport } from './TimeReportsColumns';
import { format } from 'date-fns';
import { Pencil, StickyNote, Send } from 'lucide-react';
import { getEntryOvertimeHours } from '@/utils/overtimeCalculations';

export interface TimeReportsTableProps {
  data?: TimeReport[];
  columns?: ColumnDef<TimeReport, any>[];
  isLoading?: boolean;
  onRowClick?: (row: TimeReport) => void;
  onEditHours?: (row: TimeReport) => void;
  onAddNote?: (row: TimeReport) => void;
  onSubmitForApproval?: (row: TimeReport) => void;
  periodView?: 'week' | 'month';
  onPeriodViewChange?: (view: 'week' | 'month') => void;
}

function calcOvertime(r: TimeReport, allReports: TimeReport[] = []) {
  // If overtime_hours is explicitly set, use it
  if (r.overtime_hours != null) {
    return Number.isFinite(r.overtime_hours) ? r.overtime_hours : 0;
  }
  
  // Use daily aggregation for automatic calculation
  if (allReports.length > 0) {
    // Map to the format expected by overtime calculations
    const entries = allReports.map(report => ({
      id: report.id,
      report_date: report.date,
      hours_worked: report.hours_worked,
      employee_user_id: report.employee_name, // Using employee_name as ID for now
      employee: { 
        id: report.employee_name, 
        first_name: report.employee_name.split(' ')[0] || '', 
        last_name: report.employee_name.split(' ').slice(1).join(' ') || '' 
      }
    }));
    
    return getEntryOvertimeHours(
      {
        id: r.id,
        report_date: r.date,
        hours_worked: r.hours_worked,
        employee_user_id: r.employee_name,
        employee: { 
          id: r.employee_name, 
          first_name: r.employee_name.split(' ')[0] || '', 
          last_name: r.employee_name.split(' ').slice(1).join(' ') || '' 
        }
      },
      entries
    );
  }
  
  // Fallback to old calculation if no context available
  const base = Number(r.hours_worked || 0);
  return Math.max(0, base - 8);
}

export function TimeReportsTable({
  data = [],
  columns = [],
  isLoading = false,
  onRowClick,
  onEditHours,
  onAddNote,
  onSubmitForApproval,
  periodView: externalPeriodView,
  onPeriodViewChange,
}: TimeReportsTableProps) {
  const [internalPeriodView, setInternalPeriodView] = useState<'week' | 'month'>('week');
  const periodView = externalPeriodView ?? internalPeriodView;
  const setPeriodView = (v: 'week' | 'month') => (onPeriodViewChange ? onPeriodViewChange(v) : setInternalPeriodView(v));

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totals = useMemo(() => {
    const totalHours = data.reduce((acc, r) => acc + Number(r.hours_worked || 0), 0);
    const totalOT = data.reduce((acc, r) => acc + calcOvertime(r, data), 0);
    return { totalHours, totalOT };
  }, [data]);

  return (
    <Card className="p-4 space-y-3">
      {/* Week/Month view toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">View</div>
        <div className="inline-flex rounded-md border bg-background p-1" role="tablist" aria-label="Period view">
          <Button
            type="button"
            size="sm"
            variant={periodView === 'week' ? 'default' : 'ghost'}
            onClick={() => setPeriodView('week')}
            aria-pressed={periodView === 'week'}
          >
            Week
          </Button>
          <Button
            type="button"
            size="sm"
            variant={periodView === 'month' ? 'default' : 'ghost'}
            onClick={() => setPeriodView('month')}
            aria-pressed={periodView === 'month'}
          >
            Month
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} showHeader />
      ) : (
        <>
          {/* Table - desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button, a, input, [role="menuitem"]')) return;
                        onRowClick?.(row.original);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      No time reports found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {/* Summary row */}
              {data.length > 0 && (
                <tfoot>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">Totals</TableCell>
                    <TableCell className="font-medium">{totals.totalHours.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{totals.totalOT.toFixed(2)}</TableCell>
                    <TableCell />
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No time reports found.</div>
            ) : (
              data.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-3 shadow-sm" role="article">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {r.employee_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.date ? format(new Date(r.date), 'MMM d, yyyy') : '-'}</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground truncate" title={r.work_order_number || r.work_order_title || ''}>
                    {r.work_order_number || r.work_order_title || '—'}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Hours</div>
                      <div className="font-medium">{Number(r.hours_worked || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Overtime</div>
                      <div className="font-medium">{calcOvertime(r, data).toFixed(2)}</div>
                    </div>
                  </div>
                  {r.description && (
                    <div className="mt-2 text-sm line-clamp-2" title={r.description}>{r.description}</div>
                  )}
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" aria-label="Edit hours" onClick={() => onEditHours?.(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Add note" onClick={() => onAddNote?.(r)}>
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Submit for approval" onClick={() => onSubmitForApproval?.(r)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            {/* Summary */}
            {data.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Totals</span>
                  <span>
                    {totals.totalHours.toFixed(2)} hrs • {totals.totalOT.toFixed(2)} OT
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
