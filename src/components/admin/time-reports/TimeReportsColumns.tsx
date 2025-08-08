import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableActionsDropdown, TableAction } from '@/components/ui/table-actions-dropdown';

// TimeReportsColumns: base shell following WorkOrders standard
// TODO: Replace placeholder fields with actual TimeReport entity fields and formatting

export type TimeReport = {
  id: string;
  work_order_number?: string | null;
  report_date?: string | null;
  hours_worked?: number | null;
  notes?: string | null;
};

export interface TimeReportColumnProps {
  // TODO: Add entity-specific callbacks (e.g., onEdit, onDelete) if needed
  onView?: (report: TimeReport) => void;
}

export function createTimeReportColumns({ onView }: TimeReportColumnProps = {}): ColumnDef<TimeReport>[] {
  return [
    {
      accessorKey: 'work_order_number',
      header: 'Work Order #',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('work_order_number') || '—'}</div>
      ),
    },
    {
      accessorKey: 'report_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('report_date') || '—'}</div>
      ),
    },
    {
      accessorKey: 'hours_worked',
      header: 'Hours',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('hours_worked') ?? '—'}</div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const report = row.original;
        const actions: TableAction[] = [];

        // TODO: Expand actions as needed (Edit, Delete) once business rules are defined
        if (onView) {
          actions.push({ label: 'View Details', icon: Eye, onClick: () => onView(report) });
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown
              actions={actions}
              align="end"
              itemName={`time report ${report.work_order_number || report.id}`}
            />
          </div>
        );
      },
    },
  ];
}
