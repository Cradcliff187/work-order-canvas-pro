import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ReportStatusBadge } from '@/components/ui/status-badge';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';

export interface ReportTotals {
  totalHours?: number;
  totalAmount?: number;
}

export interface ReportColumnsProps<T = any> {
  onView?: (report: T) => void;
  onApprove?: (report: T) => void;
  onReject?: (report: T) => void;
  isAdmin?: boolean;
  totalsMap?: Record<string, ReportTotals | undefined>;
}

// Safe access helpers
const getReportNumber = (r: any): string =>
  r?.report_number || r?.invoice_number || r?.id?.slice?.(0, 8) || 'N/A';

const getWorkOrderNumber = (r: any): string =>
  r?.work_orders?.work_order_number || 'N/A';

const getSubmittedBy = (r: any): string => {
  const u = r?.submitted_by;
  if (!u) return 'N/A';
  const first = u.first_name || '';
  const last = u.last_name || '';
  const name = `${first} ${last}`.trim();
  return name || u.email || 'N/A';
};

const getSubmittedAt = (r: any): string => {
  const d = r?.submitted_at;
  try {
    return d ? format(new Date(d), 'MMM dd, yyyy') : 'N/A';
  } catch {
    return 'N/A';
  }
};

const getTotalHours = (r: any, totalsMap?: ReportColumnsProps['totalsMap']): string => {
  const id = r?.id as string | undefined;
  const hours = (id && totalsMap?.[id]?.totalHours) ?? r?.total_hours;
  return typeof hours === 'number' ? `${hours.toFixed(2)}h` : 'N/A';
};


export function createReportColumns<T = any>({
  onView,
  onApprove,
  onReject,
  isAdmin = false,
  totalsMap,
}: ReportColumnsProps<T> = {}): ColumnDef<T, any>[] {
  return [
    {
      accessorKey: 'report_number',
      header: ({ column }) => <SortableHeader column={column} label="Report #" />,
      cell: ({ row }) => <span className="font-medium">{getReportNumber(row.original)}</span>,
    },
    {
      id: 'work_order_number',
      header: 'Work Order #',
      cell: ({ row }) => <span className="font-medium">{getWorkOrderNumber(row.original)}</span>,
    },
    {
      id: 'submitted_by',
      header: 'Submitted By',
      cell: ({ row }) => <span>{getSubmittedBy(row.original)}</span>,
    },
    {
      accessorKey: 'submitted_at',
      header: ({ column }) => <SortableHeader column={column} label="Submitted" />,
      cell: ({ row }) => <span>{getSubmittedAt(row.original)}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => {
        const status = (row.getValue('status') as string) || 'submitted';
        const overrideClass = status === 'submitted' ? 'bg-amber-50 text-amber-600 border-amber-200' : undefined;
        return (
          <ReportStatusBadge status={status} size="sm" showIcon className={overrideClass} />
        );
      },
    },
    {
      id: 'total_hours',
      header: 'Total Hours',
      cell: ({ row }) => <span>{getTotalHours(row.original, totalsMap)}</span>,
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const report: any = row.original;
        const canReview = isAdmin && report?.status === 'submitted';

        const actions = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => onView?.(report as T),
          },
          {
            label: 'Approve',
            icon: CheckCircle,
            onClick: () => onApprove?.(report as T),
            show: !!canReview,
          },
          {
            label: 'Reject',
            icon: XCircle,
            onClick: () => onReject?.(report as T),
            show: !!canReview,
            variant: 'destructive' as const,
          },
        ];

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown actions={actions} itemName={getReportNumber(report)} align="end" />
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
