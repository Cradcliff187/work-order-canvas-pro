
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { Plus, Download, RotateCcw, Users, Power, Edit } from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useUsers, useUserMutations, User } from '@/hooks/useUsers';
import { createUserColumns } from '@/components/admin/users/UserColumns';
import { UserBreadcrumb } from '@/components/admin/users/UserBreadcrumb';
import { CreateUserModal } from '@/components/admin/users/CreateUserModal';
import { EditUserModal } from '@/components/admin/users/EditUserModal';
import { ViewUserModal } from '@/components/admin/users/ViewUserModal';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { useViewMode } from '@/hooks/useViewMode';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserFilters {
  search?: string;
  roleFilter?: string;
  organizationId?: string;
  status?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // View mode configuration
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'admin-users',
    config: {
      mobile: ['card'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });
  
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [viewUserModalOpen, setViewUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    roleFilter: '',
    organizationId: '',
    status: '',
  });

  // Fetch data
  const { data: users, isLoading, error, refetch } = useUsers();
  const { deleteUser, updateUser } = useUserMutations();

  // Column visibility metadata and state
  const columnMetadata = {
    select: { label: 'Select', defaultVisible: true },
    name: { label: 'Name', defaultVisible: true },
    email: { label: 'Email', defaultVisible: true },
    user_role: { label: 'Role', defaultVisible: true },
    user_organization: { label: 'Organizations', defaultVisible: true },
    is_active: { label: 'Status', defaultVisible: true },
    last_login: { label: 'Last Login', defaultVisible: true },
    created_at: { label: 'Created', defaultVisible: true },
    actions: { label: 'Actions', defaultVisible: true },
  } as const;

  const {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    resetToDefaults,
    getAllColumns,
    getVisibleColumnCount,
  } = useColumnVisibility({ storageKey: 'admin-users-columns', columnMetadata });

  const isFiltered = Boolean(filters.search || filters.roleFilter || filters.status || filters.organizationId);

  // Client-side filtered users
  const filteredUsers = useMemo(() => {
    if (!users) return [] as User[];
    const q = (filters.search || '').toLowerCase().trim();
    return users.filter((u) => {
      const role = (u as any).organization_members?.[0]?.role || '';
      const orgNames = ((u as any).organization_members || [])
        .map((m: any) => m.organization?.name || '')
        .join(' ');
      const haystack = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''} ${(u as any).phone || ''} ${orgNames}`.toLowerCase();

      const matchesSearch = q ? haystack.includes(q) : true;
      const matchesRole = filters.roleFilter ? role === filters.roleFilter : true;
      const matchesStatus = filters.status ? (filters.status === 'active' ? (u as any).is_active : !(u as any).is_active) : true;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, filters]);

  const visibilityOptions = getAllColumns().map((c) => ({
    ...c,
    canHide: c.id !== 'select' && c.id !== 'actions',
  }));

  const exportColumns: ExportColumn[] = [
    { key: 'first_name', label: 'First Name', type: 'string' },
    { key: 'last_name', label: 'Last Name', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
    { key: 'organization_members.0.role', label: 'Primary Role', type: 'string' },
    { key: 'organization_members.0.organization.name', label: 'Primary Organization', type: 'string' },
    { key: 'organization_members.0.organization.organization_type', label: 'Org Type', type: 'string' },
    { key: 'created_at', label: 'Created Date', type: 'date' },
  ];

  // Column definitions with action handlers
  const columns = useMemo(() => createUserColumns({
    onView: (user) => {
      setSelectedUser(user);
      setViewUserModalOpen(true);
    },
    onEdit: (user) => {
      setSelectedUser(user);
      setEditUserModalOpen(true);
    },
    onDelete: (user) => {
      if (confirm('Are you sure you want to delete this user?')) {
        deleteUser.mutate(user.id);
      }
    },
  }), [deleteUser]);
  const table = useReactTable({
    data: filteredUsers || [],
    columns,
    pageCount: Math.ceil((filteredUsers?.length || 0) / pagination.pageSize),
    state: {
      pagination,
      sorting,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: false,
    manualSorting: false,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map(row => row.original.id);

  const handleClearFilters = () => {
    setFilters({
      search: '',
      roleFilter: '',
      organizationId: '',
      status: '',
    });
  };

  const handleClearSelection = () => {
    setRowSelection({});
  };


  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading users: {error.message}</p>
              <Button onClick={() => refetch()} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <UserBreadcrumb />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            {users?.length ? `${users.length} total users` : 'Manage system users and their access'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            allowedModes={allowedModes}
          />
          <Button onClick={() => setCreateUserModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New User
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear Selection ({selectedRows.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : !users || users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="Get started by creating your first user"
              action={{
                label: "Create User",
                onClick: () => setCreateUserModalOpen(true),
                icon: Plus
              }}
            />
          ) : (
            <>
              {/* Table View */}
              {viewMode === 'table' && (
                <div className="hidden lg:block rounded-md border">
                <Table className="admin-table">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="h-12">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
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
                          onClick={(e) => {
                            // Don't navigate if clicking interactive elements
                            const target = e.target as HTMLElement;
                            if (target instanceof HTMLButtonElement || 
                                target instanceof HTMLInputElement ||
                                target.closest('[role="checkbox"]') ||
                                target.closest('[data-radix-collection-item]') ||
                                target.closest('.dropdown-trigger')) {
                              return;
                            }
                            setSelectedUser(row.original);
                            setViewUserModalOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <EmptyTableState
                        icon={Users}
                        title="No users found"
                        description="Try adjusting your filters or search criteria"
                        colSpan={columns.length}
                      />
                    )}
                  </TableBody>
                </Table>
                </div>
              )}

              {/* Card View */}
              {viewMode === 'card' && (
                <div className="space-y-3">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const user = row.original;
                    const getPrimaryRole = () => {
                      if (user.organization_members && user.organization_members.length > 0) {
                        const primaryMembership = user.organization_members[0];
                        return `${primaryMembership.role} - ${primaryMembership.organization?.organization_type || 'Unknown'}`;
                      }
                      return 'No Organization';
                    };
                    
                    const getRoleVariant = () => {
                      if (user.organization_members && user.organization_members.length > 0) {
                        const primaryMembership = user.organization_members[0];
                        const orgType = primaryMembership.organization?.organization_type;
                        switch (orgType) {
                          case 'internal': return primaryMembership.role === 'admin' ? 'destructive' : 'outline';
                          case 'partner': return 'default';
                          case 'subcontractor': return 'secondary';
                          default: return 'secondary';
                        }
                      }
                      return 'secondary';
                    };
                    
                    return (
                      <MobileTableCard
                        key={row.id}
                        title={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User'}
                        subtitle={user.email || 'No email'}
                        status={
                          <Badge variant={getRoleVariant()} className="h-5 text-[10px] px-1.5">
                            {getPrimaryRole().toUpperCase()}
                          </Badge>
                        }
                        onClick={() => {
                          setSelectedUser(user);
                          setViewUserModalOpen(true);
                        }}
                      >
                        {user.organization_members && user.organization_members.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {user.organization_members.map((membership) => membership.organization?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                      </MobileTableCard>
                    );
                  })
                ) : (
                  <EmptyTableState
                    icon={Users}
                    title="No users found"
                    description="Try adjusting your filters or search criteria"
                    colSpan={1}
                  />
                )}
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  {selectedRows.length > 0 && (
                    <span>
                      {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <CreateUserModal 
        open={createUserModalOpen}
        onOpenChange={setCreateUserModalOpen}
      />

      {/* Edit User Modal */}
      <EditUserModal 
        open={editUserModalOpen}
        onOpenChange={setEditUserModalOpen}
        user={selectedUser}
      />

      {/* View User Modal */}
      <ViewUserModal 
        isOpen={viewUserModalOpen}
        onClose={() => setViewUserModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
