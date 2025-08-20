import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Edit, Trash2, ArrowUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Project } from '@/hooks/useProjects';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';

interface ProjectColumnsProps {
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const getStatusVariant = (status: string | null) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'on_hold':
      return 'secondary';
    case 'completed':
      return 'outline';
    default:
      return 'secondary';
  }
};

const formatStatus = (status: string | null) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'on_hold':
      return 'On Hold';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
};

export const createProjectColumns = ({ onEdit, onDelete }: ProjectColumnsProps): ColumnDef<Project>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <SortableHeader column={column} label="Name" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue('name')}
      </div>
    ),
  },
  {
    accessorKey: 'project_number',
    header: ({ column }) => (
      <SortableHeader column={column} label="Project Number" />
    ),
    cell: ({ row }) => {
      const number = row.getValue('project_number') as string;
      return (
        <div className="font-mono text-sm">
          {number || 'N/A'}
        </div>
      );
    },
  },
  {
    accessorKey: 'location_address',
    header: ({ column }) => (
      <SortableHeader column={column} label="Location" />
    ),
    cell: ({ row }) => {
      const address = row.getValue('location_address') as string;
      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-48">
            {address || 'No address'}
          </span>
          {address && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
                window.open(mapUrl, '_blank');
              }}
              aria-label={`Open map for ${address}`}
            >
              <MapPin className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <SortableHeader column={column} label="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={getStatusVariant(status)} className="h-5 text-[10px] px-1.5">
          {formatStatus(status)}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    size: 80,
    cell: ({ row }) => {
      const project = row.original;
      const projectName = `${project.project_number || 'Project'} - ${project.name}`;
      
      const actions = [
        {
          label: 'Edit',
          icon: Edit,
          onClick: () => onEdit(project)
        },
        {
          label: 'Delete',
          icon: Trash2,
          onClick: () => onDelete(project),
          variant: 'destructive' as const
        }
      ];

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <TableActionsDropdown 
            actions={actions} 
            itemName={projectName}
            align="end"
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];