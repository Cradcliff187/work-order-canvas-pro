import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, Edit, Trash2, UserPlus, MapPin, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLocationDisplay, formatLocationTooltip, generateMapUrl } from '@/lib/utils/addressUtils';
import { WorkOrder } from '@/hooks/useWorkOrders';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'received': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'estimate_needed': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

interface WorkOrderColumnsProps {
  onEdit: (workOrder: WorkOrder) => void;
  onView: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
  onAssign: (workOrder: WorkOrder) => void;
}

export const createWorkOrderColumns = ({ onEdit, onView, onDelete, onAssign }: WorkOrderColumnsProps): ColumnDef<WorkOrder>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'work_order_number',
    header: 'Work Order #',
    cell: ({ row }) => {
      const number = row.getValue('work_order_number') as string;
      return (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="font-mono font-semibold bg-primary/90 hover:bg-primary text-primary-foreground">
            {number || 'Pending'}
          </Badge>
          {number && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(number);
              }}
              title="Copy work order number"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="font-medium max-w-xs truncate">
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'organizations.name',
    header: 'Organization',
    cell: ({ row }) => row.original.organizations?.name || 'N/A',
  },
  {
    accessorKey: 'store_location',
    header: 'Location',
    cell: ({ row }) => {
      const workOrder = row.original;
      const locationDisplay = formatLocationDisplay(workOrder);
      const tooltip = formatLocationTooltip(workOrder);
      const mapUrl = generateMapUrl(workOrder);
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="truncate max-w-32">{locationDisplay}</span>
                {mapUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(mapUrl, '_blank');
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="whitespace-pre-line text-sm max-w-64">
                {tooltip}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'trades.name',
    header: 'Trade',
    cell: ({ row }) => row.original.trades?.name || 'N/A',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge className={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'work_order_assignments',
    header: 'Assigned To',
    cell: ({ row }) => {
      const assignments = row.original.work_order_assignments || [];
      
      if (assignments.length === 0) {
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700">
            Unassigned
          </Badge>
        );
      }
      
      if (assignments.length === 1) {
        const assignee = assignments[0].profiles;
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
            {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unknown'}
          </Badge>
        );
      }
      
      const lead = assignments.find(a => a.assignment_type === 'lead') || assignments[0];
      const assignee = lead.profiles;
      const leadName = assignee ? `${assignee.first_name} ${assignee.last_name.charAt(0)}.` : 'Unknown';
      const additionalCount = assignments.length - 1;
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 cursor-help">
                {leadName} + {additionalCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {assignments.map((assignment, index) => {
                  const profile = assignment.profiles;
                  return (
                    <div key={assignment.id} className="text-sm">
                      {profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown'}
                      {assignment.assignment_type === 'lead' && ' (Lead)'}
                    </div>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'date_submitted',
    header: 'Date Submitted',
    cell: ({ row }) => {
      const date = new Date(row.getValue('date_submitted'));
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    cell: ({ row }) => {
      const date = row.getValue('due_date');
      return date ? new Date(date as string).toLocaleDateString() : 'N/A';
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const workOrder = row.original;
      const workOrderName = `${workOrder.work_order_number || 'Work Order'} - ${workOrder.title}`;
      
      const actions = [
        {
          label: 'View Details',
          icon: Eye,
          onClick: () => onView(workOrder)
        },
        {
          label: 'Assign',
          icon: UserPlus,
          onClick: () => onAssign(workOrder),
          show: true // Always show for admin users
        },
        {
          label: 'Edit',
          icon: Edit,
          onClick: () => onEdit(workOrder)
        },
        {
          label: 'Delete',
          icon: Trash2,
          onClick: () => onDelete(workOrder),
          variant: 'destructive' as const
        }
      ];

      return (
        <TableActionsDropdown 
          actions={actions} 
          itemName={workOrderName}
          align="end"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];