import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Edit, Trash2, MapPin, Building2 } from 'lucide-react';
import { usePartnerLocations, usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { AddLocationModal } from '@/components/partner/AddLocationModal';
import { EditLocationModal } from '@/components/partner/EditLocationModal';
import type { Tables } from '@/integrations/supabase/types';

type PartnerLocation = Tables<'partner_locations'>;

const PartnerLocations: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PartnerLocation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<PartnerLocation | null>(null);

  const { data: locations = [], isLoading } = usePartnerLocations();
  const { deleteLocation } = usePartnerLocationMutations();

  const columns: ColumnDef<PartnerLocation>[] = [
    {
      accessorKey: 'location_number',
      header: 'Location #',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('location_number')}</div>
      ),
    },
    {
      accessorKey: 'location_name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('location_name')}</div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const location = row.original;
        const addressParts = [
          location.street_address,
          location.city,
          location.state,
          location.zip_code,
        ].filter(Boolean);
        
        return (
          <div className="text-sm text-muted-foreground">
            {addressParts.length > 0 ? addressParts.join(', ') : '—'}
          </div>
        );
      },
    },
    {
      accessorKey: 'contact_name',
      header: 'Contact',
      cell: ({ row }) => {
        const location = row.original;
        return (
          <div className="text-sm">
            {location.contact_name && (
              <div className="font-medium">{location.contact_name}</div>
            )}
            {location.contact_email && (
              <div className="text-muted-foreground">{location.contact_email}</div>
            )}
            {location.contact_phone && (
              <div className="text-muted-foreground">{location.contact_phone}</div>
            )}
            {!location.contact_name && !location.contact_email && !location.contact_phone && '—'}
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
          {row.getValue('is_active') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const location = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(location)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(location)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: locations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleEdit = (location: PartnerLocation) => {
    setEditingLocation(location);
    setShowEditModal(true);
  };

  const handleDelete = (location: PartnerLocation) => {
    setDeletingLocation(location);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (deletingLocation) {
      await deleteLocation.mutateAsync(deletingLocation.id);
      setShowDeleteDialog(false);
      setDeletingLocation(null);
    }
  };

  const activeLocations = locations.filter(location => location.is_active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading locations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLocations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search locations..."
            value={(table.getColumn('location_name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('location_name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : header.column.getCanSort()
                        ? (
                          <Button
                            variant="ghost"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-ml-4 h-auto p-4"
                          >
                            {typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : null}
                          </Button>
                        )
                        : (
                          typeof header.column.columnDef.header === 'string'
                            ? header.column.columnDef.header
                            : null
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {cell.column.columnDef.cell
                          ? typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell(cell.getContext())
                            : cell.column.columnDef.cell
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No locations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddLocationModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
      
      <EditLocationModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        location={editingLocation}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLocation?.location_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerLocations;