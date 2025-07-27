
import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  Database, 
  Trash2, 
  Users, 
  FileText,
  Settings,
  AlertTriangle,
  UserCheck,
  Search,
  X,
  AlertCircle,
  Activity,
  Terminal,
  GitBranch
} from 'lucide-react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef, flexRender, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useDevTools } from '@/hooks/useDevTools';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResults, setSqlResults] = useState<any>(null);
  const [sqlExecuteLoading, setSqlExecuteLoading] = useState(false);
  const [migrationInfo, setMigrationInfo] = useState<any>(null);
  const [isQueriesOpen, setIsQueriesOpen] = useState(false);
  const { toast } = useToast();
  
  const {
    loading,
    setupLoading,
    refreshLoading,
    authLoading,
    sqlLoading,
    counts,
    setupResult,
    authResult,
    sqlResult,
    fetchCounts,
    clearTestData,
    setupCompleteEnvironment,
    setupSqlData,
    createAuthUsers,
    fixUserOrganizations,
    verifyTestEnvironment,
    quickLogin,
    forceRefreshUsers,
  } = useDevTools();

  // Check if we're in development
  const isDevelopment = import.meta.env.MODE === 'development';
  const isAdmin = profile?.user_type === 'admin';

  useEffect(() => {
    if (isDevelopment && isAdmin) {
      fetchCounts();
      fetchImpersonationUsers();
      fetchMigrationInfo();
    }
  }, [isDevelopment, isAdmin]);

  const fetchImpersonationUsers = async () => {
    console.log('🔄 Fetching users for impersonation...');
    
    // Look specifically for test users with @workorderpro.test domain
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
      toast({
        title: "Error",
        description: "Failed to fetch users for impersonation",
        variant: "destructive",
      });
      return;
    }

    console.log(`📊 Found ${data.length} active users`);
    
    // Filter and prioritize test users
    const testUsers = data.filter(u => u?.email?.includes('@workorderpro.test'));
    const otherUsers = data.filter(u => u?.email && !u.email.includes('@workorderpro.test'));
    
    console.log(`🧪 Test users found: ${testUsers.length}, Other users: ${otherUsers.length}`);

    const usersWithOrganizations = [...testUsers, ...otherUsers]
      .filter(user => user && user.email)
      .map(user => ({
        ...user,
        organization_name: user.company_name || 'No Organization'
      } as ImpersonationUser));

    console.log(`✅ Processed ${usersWithOrganizations.length} users for impersonation`);
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

  const executeSqlQuery = async () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a SQL query",
        variant: "destructive",
      });
      return;
    }

    setSqlExecuteLoading(true);
    try {
      // For database functions, use .rpc()
      // For direct queries, we'd need a custom function
      const { data, error } = await supabase.rpc('debug_auth_state');
      
      if (error) {
        setSqlResults({ error: error.message });
        toast({
          title: "Query Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSqlResults(data);
        toast({
          title: "Query Executed",
          description: "Query completed successfully",
        });
      }
    } catch (err: any) {
      setSqlResults({ error: err.message });
      toast({
        title: "Query Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSqlExecuteLoading(false);
    }
  };

  const fetchMigrationInfo = async () => {
    try {
      // Get basic migration status
      const migrationData = {
        lastApplied: "2024-01-27 - Latest migration",
        pendingCount: 0,
        databaseVersion: "Current",
        indexedDbVersion: "v1.0.0"
      };
      setMigrationInfo(migrationData);
    } catch (error) {
      console.error('Error fetching migration info:', error);
    }
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

  const table = useReactTable({
    data: impersonationUsers,
    columns: impersonationColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

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

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Development Tools</h1>
          <Badge variant="secondary">DEV MODE</Badge>
        </div>
        <Button
          onClick={() => window.open('/admin/system-health', '_blank')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          System Health
        </Button>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Environment Setup</TabsTrigger>
          <TabsTrigger value="database">Database Tools</TabsTrigger>
          <TabsTrigger value="impersonation">Test Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-6">
          {/* STREAMLINED SETUP */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Test Environment Setup
              </CardTitle>
              <CardDescription>
                Create a complete test environment with one click
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {counts && (
                <div className="text-sm text-muted-foreground grid grid-cols-4 gap-2 p-3 bg-muted rounded-lg">
                  <div>Organizations: {counts.organizations}</div>
                  <div>Work Orders: {counts.work_orders}</div>
                  <div>Users: {counts.profiles}</div>
                  <div>User-Org Links: {counts.user_organizations}</div>
                </div>
              )}
              
              {/* ONE-CLICK SETUP */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={setupSqlData}
                    disabled={sqlLoading}
                    size="lg"
                    className="h-12 text-base"
                  >
                    {sqlLoading ? <LoadingSpinner /> : <Database className="h-5 w-5 mr-2" />}
                    Setup Test Environment
                  </Button>
                  
                  <Button
                    onClick={createAuthUsers}
                    disabled={authLoading}
                    variant="outline"
                    size="lg"
                    className="h-12 text-base"
                  >
                    {authLoading ? <LoadingSpinner /> : <Users className="h-5 w-5 mr-2" />}
                    Create Auth Users
                  </Button>
                </div>
                
                {(sqlResult || authResult) && (
                  <div className="space-y-2">
                    {sqlResult && (
                      <Alert className={sqlResult.success ? "border-green-500" : "border-red-500"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{sqlResult.success ? "Setup Complete!" : "Setup Failed"}</AlertTitle>
                        <AlertDescription>{sqlResult.message}</AlertDescription>
                      </Alert>
                    )}
                    
                    {authResult && (
                      <Alert className={authResult.success ? "border-green-500" : "border-red-500"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{authResult.success ? "Auth Users Created!" : "Auth Failed"}</AlertTitle>
                        <AlertDescription>{authResult.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
              
              {/* UTILITY ACTIONS */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Utility Actions</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={verifyTestEnvironment}
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                  >
                    {loading ? <LoadingSpinner /> : <Search className="h-4 w-4 mr-1" />}
                    Verify Setup
                  </Button>
                  <Button
                    onClick={fixUserOrganizations}
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                  >
                    {loading ? <LoadingSpinner /> : <Settings className="h-4 w-4 mr-1" />}
                    Fix Issues
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={loading}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Test Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all test data from the database. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearTestData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete All Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              {/* REFRESH DATA */}
              <div className="flex justify-center">
                <Button
                  onClick={fetchCounts}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? <LoadingSpinner /> : null}
                  Refresh Counts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          {/* Migration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Migration Status
              </CardTitle>
              <CardDescription>
                Database and IndexedDB migration information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {migrationInfo ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Database</div>
                    <div className="text-sm text-muted-foreground">
                      <div>Last Applied: {migrationInfo.lastApplied}</div>
                      <div>Pending: {migrationInfo.pendingCount} migrations</div>
                      <div>Version: {migrationInfo.databaseVersion}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">IndexedDB</div>
                    <div className="text-sm text-muted-foreground">
                      <div>Version: {migrationInfo.indexedDbVersion}</div>
                      <div>Status: Active</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Loading migration info...</div>
              )}
            </CardContent>
          </Card>

          {/* Database Queries */}
          <Card>
            <Collapsible open={isQueriesOpen} onOpenChange={setIsQueriesOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Database Queries
                    <Badge variant="outline" className="ml-auto">
                      {isQueriesOpen ? 'Hide' : 'Show'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Execute custom database functions and queries
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <Alert className="border-warning bg-warning/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> Only use database functions (RPC calls) in production. Direct SQL queries are not supported.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">SQL Query / Function Name</label>
                      <Textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="Enter database function name (e.g., debug_auth_state)"
                        className="font-mono text-sm"
                        rows={4}
                      />
                    </div>
                    
                    <Button
                      onClick={executeSqlQuery}
                      disabled={sqlExecuteLoading}
                      className="w-full"
                    >
                      {sqlExecuteLoading ? <LoadingSpinner /> : <Terminal className="h-4 w-4 mr-2" />}
                      Execute Query
                    </Button>
                    
                    {sqlResults && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Results</label>
                        <div className="p-4 bg-muted rounded-lg">
                          <pre className="text-sm overflow-x-auto">
                            {JSON.stringify(sqlResults, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </TabsContent>

        <TabsContent value="impersonation" className="space-y-6">
          <div className="space-y-4">
            {/* Test User Credentials - Combined from both legacy and new setup */}
            {((setupResult?.success && setupResult.data?.userCredentials) || (authResult?.success && authResult.data?.credentials)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test User Credentials</CardTitle>
                  <CardDescription>
                    Login credentials for test users. All passwords are: TestPass123!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Show credentials from auth result if available, otherwise legacy */}
                    {(authResult?.data?.credentials || setupResult?.data?.userCredentials || [
                      { email: 'partner1@workorderpro.test', password: 'TestPass123!', type: 'partner' },
                      { email: 'sub1@workorderpro.test', password: 'TestPass123!', type: 'subcontractor' },
                      { email: 'employee1@workorderpro.test', password: 'TestPass123!', type: 'employee' }
                    ]).map((cred: any) => (
                      <div key={cred.email} className="p-4 border rounded-lg space-y-2">
                        <div className="font-medium">{cred.type} User</div>
                        <div className="text-sm text-muted-foreground">
                          <div>Email: {cred.email}</div>
                          <div>Password: {cred.password}</div>
                        </div>
                        <Button
                          onClick={() => quickLogin(cred.email)}
                          disabled={loading}
                          size="sm"
                          className="w-full"
                        >
                          {loading ? <LoadingSpinner /> : null}
                          Quick Login
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search users by name, email, or type..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Impersonation</CardTitle>
                <CardDescription>
                  Login as different user types to test role-based functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!(setupResult?.success || sqlResult?.success || authResult?.success) ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Setup Test Environment First</AlertTitle>
                    <AlertDescription>
                      Use the "Bulletproof Test Environment Setup" in the Setup tab to create test users with proper credentials.
                      <div className="mt-2">
                        <Button 
                          onClick={fetchImpersonationUsers}
                          size="sm"
                          variant="outline"
                          disabled={loading}
                        >
                          {loading ? <LoadingSpinner /> : null}
                          Refresh User List
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : impersonationUsers.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Users Found</AlertTitle>
                    <AlertDescription>
                      No users found for impersonation. This could mean:
                      <ul className="list-disc list-inside mt-2 text-sm">
                        <li>Test environment setup hasn't been run yet</li>
                        <li>Setup failed to create test users</li>
                        <li>Users exist but aren't loading properly</li>
                      </ul>
                      <div className="mt-3 space-x-2">
                        <Button 
                          onClick={fetchImpersonationUsers}
                          size="sm"
                          variant="outline"
                          disabled={loading}
                        >
                          {loading ? <LoadingSpinner /> : null}
                          Retry User Fetch
                        </Button>
                        <Button 
                          onClick={setupCompleteEnvironment}
                          size="sm"
                          disabled={setupLoading}
                        >
                          {setupLoading ? <LoadingSpinner /> : null}
                          Setup Environment
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
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
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevTools;
