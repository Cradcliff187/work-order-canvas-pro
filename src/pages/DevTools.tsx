import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Database, 
  Trash2, 
  Users, 
  LogIn, 
  Copy,
  Building2,
  FileText,
  Settings,
  AlertTriangle,
  UserCheck,
  Search,
  X
} from 'lucide-react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useDevTools } from '@/hooks/useDevTools';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ImpersonationUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  organization_name: string;
}

const DevTools = () => {
  const { profile, setImpersonation, clearImpersonation, isImpersonating, impersonatedProfile } = useAuth();
  const [impersonationUsers, setImpersonationUsers] = useState<ImpersonationUser[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const {
    loading,
    counts,
    fetchCounts,
    runSeedScript,
    clearTestData,
    quickLogin,
    testCredentials
  } = useDevTools();

  // Check if we're in development
  const isDevelopment = import.meta.env.MODE === 'development';
  const isAdmin = profile?.user_type === 'admin';

  useEffect(() => {
    if (isDevelopment && isAdmin) {
      fetchCounts();
      fetchImpersonationUsers();
    }
  }, [isDevelopment, isAdmin]);

  const fetchImpersonationUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        user_type,
        company_name
      `)
      .eq('is_active', true)
      .order('user_type')
      .order('first_name');

    if (error) {
      console.error('Error fetching users for impersonation:', error);
      return;
    }

    const usersWithOrganizations = await Promise.all(
      data.map(async (user) => {
        let organizationName = 'No Organization';
        
        if (user.user_type === 'partner') {
          const { data: orgData } = await supabase
            .from('user_organizations')
            .select('organizations(name)')
            .eq('user_id', user.id)
            .limit(1);
          
          if (orgData && orgData.length > 0 && orgData[0].organizations) {
            organizationName = (orgData[0].organizations as any).name;
          }
        } else if (user.user_type === 'subcontractor' && user.company_name) {
          organizationName = user.company_name;
        }

        return {
          ...user,
          organization_name: organizationName
        } as ImpersonationUser;
      })
    );

    setImpersonationUsers(usersWithOrganizations);
  };

  const handleImpersonate = (user: ImpersonationUser) => {
    setImpersonation({
      id: user.id,
      user_id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type,
      is_active: true
    });
    
    toast({
      title: "Impersonation Started",
      description: `Now viewing as ${user.first_name} ${user.last_name} (${user.user_type})`,
    });
  };

  const handleStopImpersonating = () => {
    clearImpersonation();
    toast({
      title: "Impersonation Stopped",
      description: "Returned to your normal account view",
    });
  };

  const impersonationColumns: ColumnDef<ImpersonationUser>[] = useMemo(() => [
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
      accessorKey: 'organization_name',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.organization_name}</span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const user = row.original;
        const isCurrentUser = user.id === profile?.id;
        return (
          <Button
            size="sm"
            onClick={() => handleImpersonate(user)}
            disabled={isCurrentUser}
            className="flex items-center gap-1"
          >
            <UserCheck className="h-3 w-3" />
            {isCurrentUser ? 'Current User' : 'Impersonate'}
          </Button>
        );
      },
      enableSorting: false,
    },
  ], [profile?.id]);

  const impersonationTable = useReactTable({
    data: impersonationUsers,
    columns: impersonationColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setSearchFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchFilter,
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (!isDevelopment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Development Tools Unavailable</h2>
              <p className="text-muted-foreground">
                Development tools are only available in development environment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                Development tools require admin privileges.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Impersonation Warning Banner */}
      {isImpersonating && impersonatedProfile && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Viewing as:</strong> {impersonatedProfile.first_name} {impersonatedProfile.last_name} ({impersonatedProfile.user_type})
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleStopImpersonating}
              className="ml-4 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Stop Impersonating
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Development Tools</h1>
        <Badge variant="secondary">DEV MODE</Badge>
      </div>

      {/* Database Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Operations
          </CardTitle>
          <CardDescription>
            Manage test data and database seeding operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runSeedScript} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              {loading ? 'Seeding...' : 'Seed Database'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Test Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Test Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all seeded test data including users, organizations, 
                    work orders, and reports. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={clearTestData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              variant="outline" 
              onClick={fetchCounts}
              disabled={loading}
            >
              Refresh Counts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>
            Current record counts for all tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {counts ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(counts).map(([table, count]) => (
                <div key={table} className="text-center">
                  <div className="text-2xl font-bold text-primary">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {table.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Click "Refresh Counts" to load statistics
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test User Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Test User Credentials
          </CardTitle>
          <CardDescription>
            Quick access to test user accounts (password: Test123!)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Admin Users */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="secondary">Admin</Badge>
              </h4>
              <div className="grid gap-2">
                {testCredentials.filter(cred => cred.email.includes('admin')).map((cred) => (
                  <div key={cred.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{cred.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => quickLogin(cred.email)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Partner Users */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="secondary">Partner</Badge>
              </h4>
              <div className="grid gap-2">
                {testCredentials.filter(cred => cred.email.includes('partner')).map((cred) => (
                  <div key={cred.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{cred.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => quickLogin(cred.email)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Subcontractor Users */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="secondary">Subcontractor</Badge>
              </h4>
              <div className="grid gap-2">
                {testCredentials.filter(cred => 
                  !cred.email.includes('admin') && !cred.email.includes('partner')
                ).map((cred) => (
                  <div key={cred.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{cred.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => quickLogin(cred.email)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Impersonation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            User Impersonation
          </CardTitle>
          <CardDescription>
            Test the application as different user types without logging out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchImpersonationUsers}
            >
              Refresh
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {impersonationTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="px-4">
                        {header.isPlaceholder
                          ? null
                          : (typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header)}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {impersonationTable.getRowModel().rows?.length ? (
                  impersonationTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
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
                    <TableCell colSpan={impersonationColumns.length} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-sm text-muted-foreground">
              {impersonationTable.getFilteredRowModel().rows.length} user(s) available for impersonation
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => impersonationTable.previousPage()}
                disabled={!impersonationTable.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => impersonationTable.nextPage()}
                disabled={!impersonationTable.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevTools;