import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Eye, Edit, Trash2, UserPlus, MapPin, Copy, Paperclip, ArrowUpDown } from 'lucide-react';
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
  unreadCounts: Record<string, number>;
  onEdit: (workOrder: WorkOrder) => void;
  onView: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
  onAssign: (workOrder: WorkOrder) => void;
}

export const createWorkOrderColumns = ({ unreadCounts, onEdit, onView, onDelete, onAssign }: WorkOrderColumnsProps): ColumnDef<WorkOrder>[] => [
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
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'work_order_number',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Work Order
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 140,
    minSize: 120,
    maxSize: 160,
    enableResizing: false,
    cell: ({ row }) => {
      const number = row.getValue('work_order_number') as string;
      const attachmentCount = row.original.attachment_count || 0;
      return (
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm whitespace-nowrap">
            {number || 'N/A'}
          </div>
          {unreadCounts[row.original.id] > 0 && (
            <Badge variant="default" className="h-5 text-[10px] px-1.5 transition-all duration-200">
              {unreadCounts[row.original.id]}
            </Badge>
          )}
          {attachmentCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {attachmentCount > 1 && (
                <span className="text-xs font-mono">{attachmentCount}</span>
              )}
            </div>
          )}
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium truncate text-ellipsis">
        {row.getValue('title')}
      </div>
    ),
  },
  {
    id: 'organization',
    accessorFn: (row) => row.organizations?.name,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Organization
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 180,
    cell: ({ row }) => row.original.organizations?.name || 'N/A',
  },
  {
    accessorKey: 'store_location',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Location
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 150,
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
    id: 'trade',
    accessorFn: (row) => row.trades?.name,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Trade
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 120,
    cell: ({ row }) => row.original.trades?.name || 'N/A',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 100,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge className={`h-5 text-[10px] px-1.5 ${getStatusColor(status)}`}>
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    id: 'assigned_to',
    accessorFn: (row) => {
      const assignments = row.work_order_assignments || [];
      if (assignments.length === 0) return 'Unassigned';
      const lead = assignments.find(a => a.assignment_type === 'lead') || assignments[0];
      const profile = lead.profiles;
      return profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';
    },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Assigned To
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 120,
    cell: ({ row }) => {
      const assignments = row.original.work_order_assignments || [];
      
      if (assignments.length === 0) {
        return (
          <Badge variant="outline" className="h-5 text-[10px] px-1.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700">
            Unassigned
          </Badge>
        );
      }
      
      if (assignments.length === 1) {
        const assignment = assignments[0];
        const assignee = assignment.profiles;
        const isPlaceholder = assignment.notes?.includes('no active users - placeholder assignment');

        let displayText = 'Unknown';
        if (isPlaceholder && assignment.organizations) {
          displayText = assignment.organizations.name;
        } else if (assignee && assignee.user_type === 'subcontractor' && assignment.organizations) {
          displayText = assignment.organizations.name;
        } else if (assignee) {
          displayText = `${assignee.first_name} ${assignee.last_name}`;
        }

        return (
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
            {displayText}
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
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 cursor-help">
                {leadName} + {additionalCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {assignments.map((assignment) => {
                  const profile = assignment.profiles;
                  const isPlaceholder = assignment.notes?.includes('no active users - placeholder assignment');
                  
                  let displayText = 'Unknown';
                  if (isPlaceholder && assignment.organizations) {
                    displayText = assignment.organizations.name;
                  } else if (profile && profile.user_type === 'subcontractor' && assignment.organizations) {
                    displayText = assignment.organizations.name;
                  } else if (profile) {
                    displayText = `${profile.first_name} ${profile.last_name}`;
                  }
                  
                  return (
                    <div key={assignment.id} className="text-sm">
                      {displayText}
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Date Submitted
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    size: 100,
    cell: ({ row }) => {
      const date = new Date(row.getValue('date_submitted'));
      return date.toLocaleDateString();
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    size: 80,
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
        <div onClick={(e) => e.stopPropagation()}>
          <TableActionsDropdown 
            actions={actions} 
            itemName={workOrderName}
            align="end"
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];