import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableActionsDropdown, TableAction } from '@/components/ui/table-actions-dropdown';
import { format } from 'date-fns';

// TimeReportsColumns: standardized to mirror WorkOrders patterns (sorting headers, clean cells)
// NOTE: Business logic is untouched. Purely presentational/UX parity.

export type TimeReport = {
  id: string;
  work_order_number?: string | null;
  report_date?: string | null; // ISO date string
  hours_worked?: number | null;
  notes?: string | null;
};

export interface TimeReportColumnProps {
  // Optional callbacks for row-level actions
  onView?: (report: TimeReport) => void;
}

export function createTimeReportColumns({ onView }: TimeReportColumnProps = {}): ColumnDef<TimeReport>[] {
  return [
    {
      accessorKey: 'work_order_number',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
          aria-label="Sort by Work Order Number"
        >
          Work Order #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium truncate max-w-[220px]" title={row.getValue<string>('work_order_number') ?? undefined}>
          {row.getValue('work_order_number') || '—'}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'report_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
          aria-label="Sort by Date"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const raw = row.getValue<string>('report_date');
        let display = '—';
        if (raw) {
          const d = new Date(raw);
          display = isNaN(d.getTime()) ? raw : format(d, 'MMM d, yyyy');
        }
        return <div className="text-sm">{display}</div>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'hours_worked',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
          aria-label="Sort by Hours Worked"
        >
          Hours
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const hours = row.getValue<number>('hours_worked');
        const display = hours === null || hours === undefined ? '—' : Number(hours).toFixed(2);
        return <div className="text-sm tabular-nums text-right">{display}</div>;
      },
      enableSorting: true,
      meta: { align: 'right' },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => {
        const val = row.getValue<string>('notes');
        if (!val) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="truncate max-w-[320px]" title={val}>
            {val}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const report = row.original;
        const actions: TableAction[] = [];

        // Default action parity with WorkOrders: View Details
        if (onView) {
          actions.push({ label: 'View Details', icon: Eye, onClick: () => onView(report) });
        }

        return (
          <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
            <TableActionsDropdown
              actions={actions}
              align="end"
              itemName={`time report ${report.work_order_number || report.id}`}
            />
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
