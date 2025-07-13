import React, { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef, SortingState, ColumnFiltersState, VisibilityState } from '@tanstack/react-table';
import { Plus, Search, Download, Edit, Trash2, Building2, Users, FileText, Eye, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganizations, useOrganizationMutations } from '@/hooks/useOrganizations';
import { CreateOrganizationModal } from '@/components/admin/organizations/CreateOrganizationModal';
import { EditOrganizationModal } from '@/components/admin/organizations/EditOrganizationModal';
import { ViewOrganizationModal } from '@/components/admin/organizations/ViewOrganizationModal';
import { BulkActionsBar } from '@/components/admin/organizations/BulkActionsBar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { exportOrganizations } from '@/lib/utils/export';

export interface Organization {
  id: string;
  name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  organization_type: 'partner' | 'subcontractor' | 'internal';
  initials?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
  work_orders_count?: number;
  active_work_orders_count?: number;
}

const AdminOrganizations = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [viewingOrganization, setViewingOrganization] = useState<Organization | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deletingOrganization, setDeletingOrganization] = useState<Organization | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);
  const [organizationsToDelete, setOrganizationsToDelete] = useState<Organization[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: organizationsData, isLoading, refetch } = useOrganizations();
  const { deleteOrganization, bulkDeleteOrganizations, bulkToggleOrganizationStatus } = useOrganizationMutations();

  // Debug logging for AdminOrganizations component
  React.useEffect(() => {
    console.log('🏢 AdminOrganizations: Component state update:', {
      isLoading,
      organizationsData,
      dataLength: organizationsData?.organizations?.length,
      totalCount: organizationsData?.totalCount
    });
  }, [isLoading, organizationsData]);

  const handleDeleteOrganization = (org: Organization) => {
    setDeletingOrganization(org);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrganization) return;
    
    try {
      await deleteOrganization.mutateAsync(deletingOrganization.id);
      refetch();
      setDeletingOrganization(null);
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
  };

  const columns: ColumnDef<Organization>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? "indeterminate" : false)}
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
      accessorKey: 'name',
      header: 'Organization Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'initials',
      header: 'Initials',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.initials ? (
            <Badge variant="outline" className="font-mono text-sm">
              {row.original.initials}
            </Badge>
          ) : (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground text-sm">Not set</span>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'organization_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.organization_type;
        const typeConfig = {
          partner: { label: 'Partner', className: 'bg-blue-100 text-blue-800 border-blue-200' },
          subcontractor: { label: 'Subcontractor', className: 'bg-green-100 text-green-800 border-green-200' },
          internal: { label: 'Internal', className: 'bg-purple-100 text-purple-800 border-purple-200' }
        };
        const config = typeConfig[type];
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'contact_email',
      header: 'Contact Email',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.original.contact_email}</div>
      ),
    },
    {
      accessorKey: 'contact_phone',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.contact_phone || <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      accessorKey: 'users_count',
      header: 'Users',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.users_count || 0}</span>
        </div>
      ),
    },
    {
      accessorKey: 'work_orders_count',
      header: 'Work Orders',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>
            {row.original.active_work_orders_count || 0} / {row.original.work_orders_count || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const org = row.original;
        
        const actions = [
          {
            label: 'View Details',
            icon: Eye,
            onClick: () => setViewingOrganization(org)
          },
          {
            label: 'Edit Organization',
            icon: Edit,
            onClick: () => {
              setSelectedOrganization(org);
              setShowEditModal(true);
            }
          },
          {
            label: 'Manage Users',
            icon: Users,
            onClick: () => navigate(`/admin/users?org=${org.id}`)
          },
          {
            label: 'Delete Organization',
            icon: Trash2,
            onClick: () => handleDeleteOrganization(org),
            variant: 'destructive' as const
          }
        ];

        return (
          <TableActionsDropdown 
            actions={actions} 
            itemName={org.name}
            align="end"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], [navigate]);

  const filteredData = useMemo(() => {
    console.log('🔽 AdminOrganizations: Filtering data:', {
      rawData: organizationsData?.organizations,
      showOnlyActive,
      selectedType,
      rawDataLength: organizationsData?.organizations?.length
    });

    if (!organizationsData?.organizations) {
      console.log('⚠️ AdminOrganizations: No organizations data available');
      return [];
    }
    
    let filtered = organizationsData.organizations;
    
    if (showOnlyActive) {
      filtered = filtered.filter(org => org.is_active);
      console.log('🟢 AdminOrganizations: After active filter:', filtered.length);
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(org => org.organization_type === selectedType);
      console.log('🏷️ AdminOrganizations: After type filter:', filtered.length);
    }
    
    console.log('✅ AdminOrganizations: Final filtered data:', {
      filteredLength: filtered.length,
      sampleItems: filtered.slice(0, 3)
    });
    
    return filtered;
  }, [organizationsData?.organizations, showOnlyActive, selectedType]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  // Bulk action handlers
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);
  const selectedOrganizations = selectedRows.map(row => row.original);

  const handleClearSelection = () => {
    setRowSelection({});
  };

  const handleBulkExport = (ids: string[]) => {
    const organizationsToExport = filteredData.filter(org => ids.includes(org.id));
    exportOrganizations(organizationsToExport);
    toast({
      title: "Export completed",
      description: `Exported ${organizationsToExport.length} organization(s) to CSV.`,
    });
  };

  const handleBulkDeactivate = async (organizations: Organization[]) => {
    const activeOrgs = organizations.filter(org => org.is_active);
    if (activeOrgs.length === 0) {
      toast({
        title: "No organizations to deactivate",
        description: "All selected organizations are already inactive.",
        variant: "destructive",
      });
      return;
    }

    try {
      await bulkToggleOrganizationStatus.mutateAsync({
        organizationIds: activeOrgs.map(org => org.id),
        isActive: false
      });
      handleClearSelection();
    } catch (error) {
      console.error('Failed to deactivate organizations:', error);
    }
  };

  const handleBulkDelete = (organizations: Organization[]) => {
    if (organizations.length === 0) return;
    setOrganizationsToDelete(organizations);
    setBulkDeleteCount(organizations.length);
    setBulkDeleteOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await bulkDeleteOrganizations.mutateAsync(organizationsToDelete.map(org => org.id));
      handleClearSelection();
      setBulkDeleteOpen(false);
    } catch (error) {
      console.error('Failed to delete organizations:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: organizationsData?.organizations?.length || 0,
    active: organizationsData?.organizations?.filter(o => o.is_active).length || 0,
    totalUsers: organizationsData?.organizations?.reduce((acc, o) => acc + (o.users_count || 0), 0) || 0,
    totalWorkOrders: organizationsData?.organizations?.reduce((acc, o) => acc + (o.work_orders_count || 0), 0) || 0,
    partners: organizationsData?.organizations?.filter(o => o.organization_type === 'partner').length || 0,
    subcontractors: organizationsData?.organizations?.filter(o => o.organization_type === 'subcontractor').length || 0,
    internal: organizationsData?.organizations?.filter(o => o.organization_type === 'internal').length || 0,
  };

  console.log('📊 AdminOrganizations: Stats calculation:', {
    stats,
    rawOrgData: organizationsData?.organizations?.slice(0, 2)
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
          <p className="text-muted-foreground">
            Manage organizations and their associated users and work orders
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all organizations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkOrders}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Partners:</span>
                <span className="font-medium">{stats.partners}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subcontractors:</span>
                <span className="font-medium">{stats.subcontractors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Internal:</span>
                <span className="font-medium">{stats.internal}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organizations</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 w-72"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-8 rounded border border-input bg-background px-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="partner">Partners</option>
                <option value="subcontractor">Subcontractors</option>
                <option value="internal">Internal</option>
              </select>
              <Button
                variant={showOnlyActive ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyActive(!showOnlyActive)}
              >
                {showOnlyActive ? 'Active Only' : 'Show All'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="px-4">
                        {header.isPlaceholder
                          ? null
                          : header.column.getCanSort()
                          ? (
                            <Button
                              variant="ghost"
                              onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                              className="-ml-3 h-8 data-[state=open]:bg-accent"
                            >
                              {typeof header.column.columnDef.header === 'function'
                                ? header.column.columnDef.header(header.getContext())
                                : header.column.columnDef.header}
                              {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
                            </Button>
                          )
                          : (typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header)}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4">
                          {typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell(cell.getContext())
                            : cell.getValue() as React.ReactNode}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <EmptyTableState
                    icon={Building2}
                    title={globalFilter || selectedType !== 'all' || !showOnlyActive ? "No organizations found matching your criteria" : "No organizations found"}
                    description={!globalFilter && selectedType === 'all' && showOnlyActive ? "Get started by creating your first organization" : "Try adjusting your search criteria or filters"}
                    action={{
                      label: "Create Organization",
                      onClick: () => setShowCreateModal(true),
                      icon: Plus
                    }}
                    colSpan={columns.length}
                  />
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="h-8 w-16 rounded border border-input bg-background px-2 text-sm"
                >
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-24 items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  ⟪
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  ⟨
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  ⟩
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  ⟫
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedRows.length}
        selectedIds={selectedIds}
        selectedOrganizations={selectedOrganizations}
        onClearSelection={handleClearSelection}
        onExport={handleBulkExport}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
      />

      {/* Modals */}
      <CreateOrganizationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          refetch();
          toast({
            title: "Organization created",
            description: "The new organization has been created successfully.",
          });
        }}
      />

      <EditOrganizationModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        organization={selectedOrganization}
        onSuccess={() => {
          refetch();
          toast({
            title: "Organization updated",
            description: "The organization has been updated successfully.",
          });
        }}
      />

      <ViewOrganizationModal
        open={!!viewingOrganization}
        onOpenChange={(open) => !open && setViewingOrganization(null)}
        organization={viewingOrganization}
        onEdit={() => {
          setSelectedOrganization(viewingOrganization);
          setShowEditModal(true);
          setViewingOrganization(null);
        }}
      />

      <DeleteConfirmationDialog
        open={!!deletingOrganization}
        onOpenChange={(open) => !open && setDeletingOrganization(null)}
        onConfirm={handleConfirmDelete}
        itemName={deletingOrganization?.name || ''}
        itemType="organization"
        isLoading={deleteOrganization.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleConfirmBulkDelete}
        itemName={`${bulkDeleteCount} organizations`}
        itemType="organizations"
        isLoading={bulkDeleteOrganizations.isPending}
      />
    </div>
  );
};

export default AdminOrganizations;