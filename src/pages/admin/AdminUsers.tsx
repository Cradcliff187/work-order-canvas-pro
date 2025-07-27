
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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Download, RotateCcw, Users } from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useUsers, useUserMutations, User } from '@/hooks/useUsers';
import { createUserColumns } from '@/components/admin/users/UserColumns';
import { UserBreadcrumb } from '@/components/admin/users/UserBreadcrumb';
import { CreateUserModal } from '@/components/admin/users/CreateUserModal';
import { EditUserModal } from '@/components/admin/users/EditUserModal';
import { ViewUserModal } from '@/components/admin/users/ViewUserModal';
import { useToast } from '@/hooks/use-toast';

interface UserFilters {
  search?: string;
  userType?: string;
  organizationId?: string;
  status?: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const renderTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

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
            renderTableSkeleton()
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
              <div className="rounded-md border">
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
                          onClick={() => {
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
