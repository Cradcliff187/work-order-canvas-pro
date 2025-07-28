
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
import { Plus, Download, RotateCcw, Users } from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useUsers, useUserMutations, User } from '@/hooks/useUsers';
import { createUserColumns } from '@/components/admin/users/UserColumns';
import { UserBreadcrumb } from '@/components/admin/users/UserBreadcrumb';
import { CreateUserModal } from '@/components/admin/users/CreateUserModal';
import { EditUserModal } from '@/components/admin/users/EditUserModal';
import { ViewUserModal } from '@/components/admin/users/ViewUserModal';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface UserFilters {
  search?: string;
  userType?: string;
  organizationId?: string;
  status?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
    userType: '',
    organizationId: '',
    status: '',
  });

  // Fetch data
  const { data: users, isLoading, error, refetch } = useUsers();
  const { deleteUser } = useUserMutations();

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

  // React Table configuration
  const table = useReactTable({
    data: users || [],
    columns,
    pageCount: Math.ceil((users?.length || 0) / pagination.pageSize),
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
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
      userType: '',
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
        <Button onClick={() => setCreateUserModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New User
        </Button>
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
              {/* Desktop Table */}
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

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const user = row.original;
                    const getRoleVariant = (userType: string) => {
                      switch (userType) {
                        case 'admin': return 'destructive';
                        case 'partner': return 'default';
                        case 'subcontractor': return 'secondary';
                        case 'employee': return 'outline';
                        default: return 'secondary';
                      }
                    };
                    
                    return (
                      <MobileTableCard
                        key={row.id}
                        title={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User'}
                        subtitle={user.email || 'No email'}
                        status={
                          <Badge variant={getRoleVariant(user.user_type)} className="h-5 text-[10px] px-1.5">
                            {user.user_type?.toUpperCase() || 'UNKNOWN'}
                          </Badge>
                        }
                        onClick={() => {
                          setSelectedUser(user);
                          setViewUserModalOpen(true);
                        }}
                      >
                        {(user as any).organizations && (user as any).organizations.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {(user as any).organizations.map((org: any) => org.name).join(', ')}
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
