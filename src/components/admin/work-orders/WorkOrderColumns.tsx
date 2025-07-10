import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
  assigned_user: { first_name: string; last_name: string } | null;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'received': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

interface WorkOrderColumnsProps {
  onEdit: (workOrder: WorkOrder) => void;
  onView: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
}

export const createWorkOrderColumns = ({ onEdit, onView, onDelete }: WorkOrderColumnsProps): ColumnDef<WorkOrder>[] => [
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
    cell: ({ row }) => (
      <Button
        variant="link"
        className="p-0 h-auto font-mono text-primary"
        onClick={() => onView(row.original)}
      >
        {row.getValue('work_order_number') || 'N/A'}
      </Button>
    ),
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
    header: 'Store Location',
    cell: ({ row }) => row.getValue('store_location') || 'N/A',
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
    accessorKey: 'assigned_user',
    header: 'Assigned To',
    cell: ({ row }) => {
      const user = row.original.assigned_user;
      return user ? `${user.first_name} ${user.last_name}` : 'Unassigned';
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

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(workOrder)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(workOrder)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(workOrder)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];