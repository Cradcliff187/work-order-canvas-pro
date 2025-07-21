
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Eye, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  trades: { name: string } | null;
  organizations: { name: string } | null;
};

interface WorkOrderColumnProps {
  onView: (workOrder: WorkOrder) => void;
}

export function createWorkOrderColumns({ onView }: WorkOrderColumnProps): ColumnDef<WorkOrder>[] {
  return [
    {
      accessorKey: 'work_order_number',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Work Order #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('work_order_number') || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue('title')}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <WorkOrderStatusBadge status={row.getValue('status')} />
      ),
    },
    {
      id: 'location',
      header: 'Location',
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
      id: 'trade',
      header: 'Trade',
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
