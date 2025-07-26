
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Eye, ArrowUpDown, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { TableActionsDropdown, TableAction } from '@/components/ui/table-actions-dropdown';

// Work order type from the hook
type WorkOrder = {
  id: string;
  work_order_number: string | null;
  title: string;
  status: string;
  store_location: string | null;
  city: string | null;
  state: string | null;
  date_submitted: string;
  attachment_count?: number;
  trades: { name: string } | null;
  organizations: { name: string } | null;
};

interface WorkOrderColumnProps {
  unreadCounts: Record<string, number>;
  onView: (workOrder: WorkOrder) => void;
}

export function createWorkOrderColumns({ unreadCounts, onView }: WorkOrderColumnProps): ColumnDef<WorkOrder>[] {
  return [
    {
      accessorKey: 'work_order_number',
      header: 'Work Order #',
      cell: ({ row }) => {
        const attachmentCount = row.original.attachment_count || 0;
        return (
          <div className="font-medium flex items-center gap-2">
            {row.getValue('work_order_number') || 'N/A'}
            {unreadCounts[row.original.id] > 0 && (
              <Badge variant="default">
                {unreadCounts[row.original.id]}
              </Badge>
            )}
            {attachmentCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {attachmentCount > 1 && (
                  <span className="text-xs">{attachmentCount}</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue('title')}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <WorkOrderStatusBadge status={row.getValue('status')} />
      ),
    },
    {
      accessorKey: 'store_location',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const storeLocation = row.original.store_location;
        const city = row.original.city;
        const state = row.original.state;
        
        return (
          <div className="max-w-[180px]">
            <div className="font-medium truncate">{storeLocation || 'N/A'}</div>
            {city && state && (
              <div className="text-sm text-muted-foreground truncate">
                {city}, {state}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row.trades?.name,
      id: 'trade',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Trade
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.trades?.name || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'date_submitted',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Submitted
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.getValue('date_submitted')), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const workOrder = row.original;
        
        const actions: TableAction[] = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => onView(workOrder),
          },
        ];

        return (
          <TableActionsDropdown
            actions={actions}
            align="end"
            itemName={`work order ${workOrder.work_order_number || workOrder.title}`}
          />
        );
      },
    },
  ];
}
