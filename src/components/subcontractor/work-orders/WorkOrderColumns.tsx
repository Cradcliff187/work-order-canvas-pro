import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, MapPin, Building, Calendar, MessageCircle, ArrowUpDown, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { WorkOrderStatusBadge } from '@/components/ui/work-order-status-badge';
import { TableActionsDropdown, TableAction } from '@/components/ui/table-actions-dropdown';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: 'assigned' | 'in_progress' | 'received' | 'completed' | 'cancelled' | 'estimate_needed' | 'estimate_approved';
  store_location: string;
  city: string;
  state: string;
  date_submitted: string;
  description: string;
  trades?: {
    name: string;
  };
  work_order_attachments?: Array<{ file_type: string }>;
}

interface WorkOrderColumnProps {
  unreadCounts: Record<string, number>;
  onPreview?: (workOrder: WorkOrder) => void;
  onView: (workOrder: WorkOrder) => void;
  onSubmitReport?: (workOrder: WorkOrder) => void;
}

export function createSubcontractorWorkOrderColumns({ 
  unreadCounts, 
  onPreview,
  onView, 
  onSubmitReport
}: WorkOrderColumnProps): ColumnDef<WorkOrder>[] {
  return [
    {
      accessorKey: 'work_order_number',
      header: 'Work Order #',
      cell: ({ row }) => {
        const workOrder = row.original;
        const unreadCount = unreadCounts[workOrder.id] || 0;
        const attachmentCount = workOrder.work_order_attachments?.length || 0;

        return (
          <div className="font-medium flex items-center gap-2">
            {workOrder.work_order_number || 'N/A'}
            {unreadCount > 0 && (
              <Badge variant="default">
                {unreadCount}
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
      cell: ({ row }) => {
        const workOrder = row.original;
        
        return (
          <div className="max-w-[200px]">
            <div className="font-medium truncate">{workOrder.title}</div>
            <div className="text-sm text-muted-foreground truncate mt-1">
              {workOrder.description}
            </div>
          </div>
        );
      },
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
        const workOrder = row.original;
        
        return (
          <div className="max-w-[180px]">
            <div className="font-medium truncate">{workOrder.store_location || 'N/A'}</div>
            {workOrder.city && workOrder.state && (
              <div className="text-sm text-muted-foreground truncate">
                {workOrder.city}, {workOrder.state}
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
        const canSubmitReport = workOrder.status === 'assigned' || workOrder.status === 'in_progress';
        
        const actions: TableAction[] = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => onView(workOrder),
          },
        ];

        if (canSubmitReport && onSubmitReport) {
          actions.push({
            label: 'Submit Report',
            icon: FileText,
            onClick: () => onSubmitReport(workOrder),
          });
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown
              actions={actions}
              align="end"
              itemName={`work order ${workOrder.work_order_number || workOrder.title}`}
            />
          </div>
        );
      },
    },
  ];
}