import React, { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableActionsDropdown, TableAction } from '@/components/ui/table-actions-dropdown';
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
import { Plus, Edit, Trash2, MapPin, Building2, X, ArrowUpDown } from 'lucide-react';
import { usePartnerLocations, usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { useUserOrganization } from '@/hooks/useUserOrganization';
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

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('name-asc');

  // Get user's organization
  const { organization, loading: organizationLoading, error: organizationError } = useUserOrganization();
  
  // Fetch locations for the user's organization
  const { data: locations = [], isLoading: locationsLoading } = usePartnerLocations(organization?.id);
  const { deleteLocation } = usePartnerLocationMutations();

  // Combined loading state
  const isLoading = organizationLoading || locationsLoading;

  // Enhanced filtering logic
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = locations;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((location) => {
        const searchableFields = [
          location.location_name,
          location.location_number,
          location.contact_name,
          location.contact_email,
          location.street_address,
          location.city,
          location.state,
          location.zip_code,
        ].filter(Boolean);
        
        return searchableFields.some(field => 
          field?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((location) => {
        if (statusFilter === 'active') return location.is_active;
        if (statusFilter === 'inactive') return !location.is_active;
        return true;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.location_name.localeCompare(b.location_name);
        case 'name-desc':
          return b.location_name.localeCompare(a.location_name);
        case 'number-asc':
          return a.location_number.localeCompare(b.location_number);
        case 'number-desc':
          return b.location_number.localeCompare(a.location_number);
        case 'status-active':
          return b.is_active === a.is_active ? 0 : b.is_active ? 1 : -1;
        case 'status-inactive':
          return b.is_active === a.is_active ? 0 : a.is_active ? 1 : -1;
        default:
          return 0;
      }
    });

    return sorted;
  }, [locations, searchTerm, statusFilter, sortOption]);

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
          <TableActionsDropdown
            itemName={location.location_name}
            actions={[
              {
                label: 'Edit',
                icon: Edit,
                onClick: () => handleEdit(location),
              },
              {
                label: 'Delete',
                icon: Trash2,
                onClick: () => handleDelete(location),
                variant: 'destructive',
              },
            ]}
          />
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredAndSortedLocations,
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

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortOption('name-asc');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || sortOption !== 'name-asc';
  const activeLocations = locations.filter(location => location.is_active);
  const isFilteredView = hasActiveFilters && filteredAndSortedLocations.length === 0 && locations.length > 0;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" aria-busy="true" aria-live="polite">
        <div className="text-muted-foreground">Loading locations...</div>
      </div>
    );
  }

  // Show error state if organization couldn't be loaded
  if (organizationError || !organization) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-destructive mb-2">Unable to load organization</div>
          <div className="text-sm text-muted-foreground">
            {organizationError?.message || 'Organization not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live region for status updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? 'Loading locations...' : `Showing ${filteredAndSortedLocations.length} of ${locations.length} locations`}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLocations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Locations</h2>
          <Button onClick={() => setShowAddModal(true)} aria-label="Add new location">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Location
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, number, contact, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              aria-label="Search locations"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Sort locations">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="number-asc">Number (Low-High)</SelectItem>
              <SelectItem value="number-desc">Number (High-Low)</SelectItem>
              <SelectItem value="status-active">Status (Active First)</SelectItem>
              <SelectItem value="status-inactive">Status (Inactive First)</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full sm:w-auto"
              aria-label="Clear all filters"
            >
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Clear Filters
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedLocations.length} of {locations.length} locations
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table aria-busy={isLoading} aria-label="Partner locations table">
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
                            aria-label={`Sort by ${header.column.columnDef.header} ${
                              header.column.getIsSorted() === 'asc' ? 'descending' : 'ascending'
                            }`}
                            aria-sort={
                              header.column.getIsSorted() === 'asc' ? 'ascending' :
                              header.column.getIsSorted() === 'desc' ? 'descending' : 'none'
                            }
                          >
                            {typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : null}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
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
                    {isFilteredView ? (
                      <div className="space-y-2">
                        <div>No locations match your current filters.</div>
                        <Button variant="outline" onClick={clearFilters} size="sm">
                          Clear filters to see all locations
                        </Button>
                      </div>
                    ) : (
                      'No locations found.'
                    )}
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
        <AlertDialogContent role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-description">
          <AlertDialogHeader>
            <AlertDialogTitle id="delete-title">Delete Location</AlertDialogTitle>
            <AlertDialogDescription id="delete-description">
              Are you sure you want to delete "{deletingLocation?.location_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLocation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLocation.isPending}
              aria-busy={deleteLocation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLocation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerLocations;
