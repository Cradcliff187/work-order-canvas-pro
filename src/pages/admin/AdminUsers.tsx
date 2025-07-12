import React, { useState, useMemo, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef, SortingState, ColumnFiltersState, VisibilityState } from '@tanstack/react-table';
import { Plus, Search, Filter, Download, MoreHorizontal, Edit, Trash2, RefreshCw, Eye, Mail, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers, useUserMutations } from '@/hooks/useUsers';
import { UserFilters } from '@/components/admin/users/UserFilters';
import { CreateUserModal } from '@/components/admin/users/CreateUserModal';
import { EditUserModal } from '@/components/admin/users/EditUserModal';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { exportUsers } from '@/lib/utils/export';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  is_active: boolean;
  phone?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
  organizations?: Array<{ id: string; name: string }>;
  last_sign_in_at?: string;
}

const AdminUsers = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const orgFilter = searchParams.get('org');
  
  const { toast } = useToast();
  const { data: usersData, isLoading, refetch } = useUsers();
  const { deleteUser, toggleUserStatus } = useUserMutations();
  const { data: organizationsData } = useOrganizations();
  
  // Find the filtered organization name
  const filteredOrganization = orgFilter ? 
    organizationsData?.organizations?.find(org => org.id === orgFilter) : null;

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      refetch();
      setDeletingUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await toggleUserStatus.mutateAsync({ userId: user.id, isActive: !user.is_active });
      refetch();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleResetPassword = async (user: User) => {
    setResettingPasswordUserId(user.id);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Password reset email sent",
        description: `Password reset email sent to ${user.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending password reset",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setResettingPasswordUserId(null);
    }
  };

  const handleExport = () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      const dataToExport = selectedRows.length > 0 
        ? selectedRows.map(row => row.original)
        : filteredUsers;

      if (!dataToExport || dataToExport.length === 0) {
        toast({ 
          title: 'No data to export', 
          description: 'No users available to export.',
          variant: 'destructive' 
        });
        return;
      }
      
      exportUsers(dataToExport);
      toast({ 
        title: 'Export completed',
        description: `Successfully exported ${dataToExport.length} user(s) to CSV.`
      });
    } catch (error) {
      toast({ 
        title: 'Export failed', 
        description: 'Failed to export users. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const columns: ColumnDef<User>[] = useMemo(() => [
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
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="font-medium">
            {user.first_name} {user.last_name}
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.original.email}</div>
      ),
    },
    {
      accessorKey: 'user_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.user_type;
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          admin: "destructive",
          employee: "outline",
          partner: "default",
          subcontractor: "secondary"
        };
        return (
          <Badge variant={variants[type] || "outline"}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'organizations',
      header: 'Organizations',
      cell: ({ row }) => {
        const orgs = row.original.organizations || [];
        if (orgs.length === 0) return <span className="text-muted-foreground">None</span>;
        if (orgs.length === 1) return orgs[0].name;
        return (
          <span className="text-sm">
            {orgs[0].name} {orgs.length > 1 && `+${orgs.length - 1} more`}
          </span>
        );
      },
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
      accessorKey: 'last_sign_in_at',
      header: 'Last Login',
      cell: ({ row }) => {
        const lastLogin = row.original.last_sign_in_at;
        if (!lastLogin) return <span className="text-muted-foreground">Never</span>;
        return (
          <span className="text-sm">
            {new Date(lastLogin).toLocaleDateString()}
          </span>
        );
      },
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
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleResetPassword(user)}
                disabled={resettingPasswordUserId === user.id}
              >
                <Mail className="mr-2 h-4 w-4" />
                {resettingPasswordUserId === user.id ? "Sending..." : "Reset Password"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {user.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], []);

  // Filter users by organization if filter is present
  const filteredUsers = useMemo(() => {
    if (!orgFilter || !usersData?.users) return usersData?.users || [];
    
    return usersData.users.filter(user => 
      user.organizations?.some(org => org.id === orgFilter)
    );
  }, [usersData?.users, orgFilter]);

  const table = useReactTable({
    data: filteredUsers,
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

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

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
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            User Management
            {filteredOrganization && ` - ${filteredOrganization.name}`}
          </h1>
          <p className="text-muted-foreground">
            {orgFilter && filteredOrganization ? (
              <span className="flex items-center gap-2">
                Showing users for {filteredOrganization.name}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchParams({})}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filter
                </Button>
              </span>
            ) : (
              usersData?.totalCount ? `${usersData.totalCount} total users` : 'Manage system users and their permissions'
            )}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 w-72"
                />
              </div>
              <UserFilters table={table} />
              <Button variant="outline" size="sm" onClick={handleExport}>
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
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
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

      <CreateUserModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          refetch();
          toast({
            title: "User created",
            description: "The new user has been created successfully.",
          });
        }}
      />

      <EditUserModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        user={selectedUser}
        onSuccess={() => {
          refetch();
          toast({
            title: "User updated",
            description: "The user has been updated successfully.",
          });
        }}
      />

      <DeleteConfirmationDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
        itemName={deletingUser ? `${deletingUser.first_name} ${deletingUser.last_name}` : ''}
        itemType="user"
        isLoading={deleteUser.isPending}
      />
    </div>
  );
};

export default AdminUsers;