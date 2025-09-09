import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, MapPin } from 'lucide-react';
import { SortableHeader } from '@/components/admin/shared/SortableHeader';
import { generateMapUrl } from '@/lib/utils/addressUtils';

interface PartnerLocation {
  id: string;
  location_name: string;
  location_number: string;
  organization_id: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

interface WorkOrderCounts {
  received: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  estimate_needed: number;
  estimate_pending_approval: number;
  total: number;
}

interface LocationColumnsOptions {
  workOrderCounts?: Record<string, WorkOrderCounts>;
  organizationMap: Record<string, any>;
  onEdit: (location: PartnerLocation) => void;
  onDelete: (location: PartnerLocation) => void;
  rowSelection?: Record<string, boolean>;
  setRowSelection?: (selection: Record<string, boolean>) => void;
  bulkMode?: boolean;
}

export function createLocationColumns({
  workOrderCounts = {},
  organizationMap,
  onEdit,
  onDelete,
  rowSelection = {},
  setRowSelection,
  bulkMode = false,
}: LocationColumnsOptions): ColumnDef<PartnerLocation>[] {
  
  const formatAddress = (location: PartnerLocation) => {
    const parts = [location.street_address, location.city, location.state, location.zip_code].filter(Boolean);
    return parts.join(', ');
  };

  const columns: ColumnDef<PartnerLocation>[] = [];

  // Bulk selection column
  if (bulkMode) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all locations"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select location"
        />
      ),
      enableSorting: false,
      size: 40,
    });
  }

  // Location Number - sortable
  columns.push({
    accessorKey: 'location_number',
    header: ({ column }) => <SortableHeader column={column} label="Location #" />,
    cell: ({ getValue }) => (
      <span className="font-mono text-sm">{getValue() as string}</span>
    ),
    size: 120,
  });

  // Location Name - sortable
  columns.push({
    accessorKey: 'location_name',
    header: ({ column }) => <SortableHeader column={column} label="Location Name" />,
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue() as string}</span>
    ),
    minSize: 150,
  });

  // Organization - sortable
  columns.push({
    accessorKey: 'organization_id',
    id: 'organization',
    header: ({ column }) => <SortableHeader column={column} label="Organization" />,
    cell: ({ getValue }) => (
      <span>{organizationMap[getValue() as string]?.name || 'Unknown'}</span>
    ),
    sortingFn: (rowA, rowB) => {
      const orgA = organizationMap[rowA.getValue('organization_id') as string]?.name || '';
      const orgB = organizationMap[rowB.getValue('organization_id') as string]?.name || '';
      return orgA.localeCompare(orgB);
    },
    minSize: 150,
  });

  // Address
  columns.push({
    id: 'address',
    accessorFn: (row) => formatAddress(row),
    header: 'Address',
    cell: ({ row }) => {
      const address = formatAddress(row.original);
      
      if (!address) return <span className="text-muted-foreground">No address</span>;
      
      const addressObj = {
        street: row.original.street_address || '',
        city: row.original.city || '',
        state: row.original.state || '',
        zip: row.original.zip_code || ''
      };
      
      return (
        <div className="flex items-center gap-2">
          <span className="truncate">{address}</span>
          {address && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => window.open(generateMapUrl(addressObj), '_blank')}
            >
              <MapPin className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    },
    enableSorting: false,
    minSize: 200,
  });

  // Work Order Status Columns - all sortable
  columns.push({
    id: 'wo_received',
    accessorFn: (row) => workOrderCounts[row.id]?.received || 0,
    header: ({ column }) => <SortableHeader column={column} label="Received" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.received || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 80,
  });

  columns.push({
    id: 'wo_assigned',
    accessorFn: (row) => workOrderCounts[row.id]?.assigned || 0,
    header: ({ column }) => <SortableHeader column={column} label="Assigned" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.assigned || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 80,
  });

  columns.push({
    id: 'wo_in_progress',
    accessorFn: (row) => workOrderCounts[row.id]?.in_progress || 0,
    header: ({ column }) => <SortableHeader column={column} label="In Progress" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.in_progress || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 90,
  });

  columns.push({
    id: 'wo_estimate_needed',
    accessorFn: (row) => workOrderCounts[row.id]?.estimate_needed || 0,
    header: ({ column }) => <SortableHeader column={column} label="Est. Needed" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.estimate_needed || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 90,
  });

  columns.push({
    id: 'wo_estimate_pending',
    accessorFn: (row) => workOrderCounts[row.id]?.estimate_pending_approval || 0,
    header: ({ column }) => <SortableHeader column={column} label="Est. Pending" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.estimate_pending_approval || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 90,
  });

  columns.push({
    id: 'wo_completed',
    accessorFn: (row) => workOrderCounts[row.id]?.completed || 0,
    header: ({ column }) => <SortableHeader column={column} label="Completed" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.completed || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 80,
  });

  columns.push({
    id: 'wo_cancelled',
    accessorFn: (row) => workOrderCounts[row.id]?.cancelled || 0,
    header: ({ column }) => <SortableHeader column={column} label="Cancelled" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.cancelled || 0;
      return (
        <div className="text-center">
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
    size: 80,
  });

  // Total Work Orders - sortable
  columns.push({
    id: 'wo_total',
    accessorFn: (row) => workOrderCounts[row.id]?.total || 0,
    header: ({ column }) => <SortableHeader column={column} label="Total" />,
    cell: ({ row }) => {
      const count = workOrderCounts[row.id]?.total || 0;
      return (
        <div className="text-center">
          <Badge variant="outline" className="font-medium">
            {count}
          </Badge>
        </div>
      );
    },
    size: 80,
  });

  // Status - sortable
  columns.push({
    accessorKey: 'is_active',
    id: 'status',
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ getValue }) => (
      <Badge variant={getValue() ? 'default' : 'secondary'}>
        {getValue() ? 'Active' : 'Inactive'}
      </Badge>
    ),
    sortingFn: (rowA, rowB) => {
      const statusA = rowA.getValue('is_active') ? 1 : 0;
      const statusB = rowB.getValue('is_active') ? 1 : 0;
      return statusA - statusB;
    },
    size: 100,
  });

  // City (optional)
  columns.push({
    accessorKey: 'city',
    header: 'City',
    cell: ({ getValue }) => (
      <span>{getValue() as string || ''}</span>
    ),
    enableSorting: false,
    size: 100,
  });

  // State (optional)
  columns.push({
    accessorKey: 'state',
    header: 'State',
    cell: ({ getValue }) => (
      <span>{getValue() as string || ''}</span>
    ),
    enableSorting: false,
    size: 80,
  });

  // ZIP (optional)
  columns.push({
    accessorKey: 'zip_code',
    header: 'ZIP',
    cell: ({ getValue }) => (
      <span>{getValue() as string || ''}</span>
    ),
    enableSorting: false,
    size: 80,
  });

  // Contact (optional)
  columns.push({
    accessorKey: 'contact_name',
    header: 'Contact',
    cell: ({ getValue }) => (
      <span>{getValue() as string || ''}</span>
    ),
    enableSorting: false,
    size: 120,
  });

  // Created Date - sortable
  columns.push({
    accessorKey: 'created_at',
    header: ({ column }) => <SortableHeader column={column} label="Created" />,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(getValue() as string).toLocaleDateString()}
      </span>
    ),
    size: 100,
  });

  // Actions
  columns.push({
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(row.original)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
    size: 50,
  });

  return columns;
}