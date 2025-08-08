import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, StickyNote, Send } from 'lucide-react';
import { format } from 'date-fns';

export type TimeReport = {
  id: string;
  date: string; // ISO string
  employee_name: string;
  work_order_number?: string | null;
  work_order_title?: string | null;
  hours_worked: number;
  overtime_hours?: number | null; // if undefined, calculate as max(0, hours_worked - 8)
  description?: string | null;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
};

export interface TimeReportColumnProps<T = TimeReport> {
  onView?: (report: T) => void;
  onEditHours?: (report: T) => void;
  onAddNote?: (report: T) => void;
  onSubmitForApproval?: (report: T) => void;
}

function calcOvertime(r: TimeReport) {
  const base = Number(r.hours_worked || 0);
  const ot = r.overtime_hours ?? Math.max(0, base - 8);
  return Number.isFinite(ot) ? ot : 0;
}

export function createTimeReportColumns<T extends TimeReport = TimeReport>(props: TimeReportColumnProps<T> = {}): ColumnDef<T, any>[] {
  const { onEditHours, onAddNote, onSubmitForApproval } = props;

  return [
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const d = row.original as TimeReport;
        return <span>{d.date ? format(new Date(d.date), 'MMM d, yyyy') : '-'}</span>;
      },
    },
    {
      id: 'employee_name',
      accessorKey: 'employee_name',
      header: 'Employee',
      cell: ({ getValue }) => <span>{(getValue() as string) || '-'}</span>,
    },
    {
      id: 'work_order',
      header: 'Work Order',
      cell: ({ row }) => {
        const r = row.original as TimeReport;
        const wo = r.work_order_number || r.work_order_title;
        return <span className="truncate max-w-[200px]" title={wo || ''}>{wo || '-'}</span>;
      },
    },
    {
      id: 'hours_worked',
      accessorKey: 'hours_worked',
      header: 'Hours',
      cell: ({ getValue }) => {
        const v = Number(getValue() as number);
        return <span>{Number.isFinite(v) ? v.toFixed(2) : '0.00'}</span>;
      },
      meta: { align: 'right' },
    },
    {
      id: 'overtime_hours',
      header: 'Overtime',
      cell: ({ row }) => {
        const v = calcOvertime(row.original as TimeReport);
        const auto = (row.original as TimeReport).overtime_hours == null && v > 0;
        return (
          <div className="flex items-center gap-2 justify-end">
            <span>{v.toFixed(2)}</span>
            {auto && (
              <Badge variant="secondary" className="text-[10px]">auto</Badge>
            )}
          </div>
        );
      },
      meta: { align: 'right' },
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => {
        const v = (getValue() as string) || '';
        return <span className="line-clamp-2 max-w-[320px]" title={v}>{v || '-'}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const r = row.original as T;
        return (
          <div className="flex items-center justify-end gap-1">
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
        );
      },
      meta: { align: 'right' },
    },
  ];
}
