import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  X,
  BarChart3,
  Shield,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Timer,
  Zap,
  Target,
  PieChart
} from 'lucide-react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useDevTools } from '@/hooks/useDevTools';
import { useCompanyAccessVerification } from '@/hooks/useCompanyAccessVerification';
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
    analytics,
    performance,
    fetchAllMetrics,
    fetchCompanyAnalytics,
    runSeedScript,
    clearTestData,
    quickLogin,
    testCredentials
  } = useDevTools();

  const {
    loading: verificationLoading,
    results: verificationResults,
    runVerification
  } = useCompanyAccessVerification();

  // Check if we're in development
  const isDevelopment = import.meta.env.MODE === 'development';
  const isAdmin = profile?.user_type === 'admin';

  useEffect(() => {
    if (isDevelopment && isAdmin) {
      fetchAllMetrics();
      fetchImpersonationUsers();
    }
  }, [isDevelopment, isAdmin, fetchAllMetrics]);

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

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="impersonation" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Impersonation
          </TabsTrigger>
        </TabsList>

        {/* Database Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
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
                  onClick={fetchAllMetrics}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Refresh Metrics
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    fetchCompanyAnalytics();
                    toast({ title: "Analytics refreshed separately" });
                  }}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Refresh Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Database Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Database Statistics
              </CardTitle>
              <CardDescription>
                Comprehensive record counts and table information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {counts ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(counts).map(([table, count]) => (
                    <div key={table} className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {table.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  Click "Refresh All Metrics" to load statistics
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-6">
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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <>
              {/* User & Organization Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.userDistribution).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={type === 'total' ? 'default' : 'secondary'}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Badge>
                          </div>
                          <div className="font-mono text-lg">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Organization Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.organizationBreakdown).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={type === 'total' ? 'default' : 'outline'}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Badge>
                          </div>
                          <div className="font-mono text-lg">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Work Order Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Work Order Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Status Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.workOrderStats.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Key Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Orders</span>
                          <span className="font-mono">{analytics.workOrderStats.totalOrders}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Avg per Organization</span>
                          <span className="font-mono">{analytics.workOrderStats.averagePerOrganization}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Top Organizations</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {analytics.workOrderStats.byOrganization
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 5)
                          .map((org, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-xs">
                                {org.type}
                              </Badge>
                              <span className="truncate">{org.name}</span>
                            </div>
                            <span className="font-mono">{org.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Patterns & Data Quality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Assignment Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Individual Assignments</span>
                        <Badge variant="secondary">{analytics.assignmentPatterns.individualAssignments}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Organization Assignments</span>
                        <Badge variant="secondary">{analytics.assignmentPatterns.organizationAssignments}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Multiple Assignments</span>
                        <Badge variant="outline">{analytics.assignmentPatterns.multipleAssignments}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Unassigned Orders</span>
                        <Badge variant={analytics.assignmentPatterns.unassignedOrders > 0 ? "destructive" : "secondary"}>
                          {analytics.assignmentPatterns.unassignedOrders}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Data Quality Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Completion Rate</span>
                          <span>{analytics.dataQuality.completionRate}%</span>
                        </div>
                        <Progress value={analytics.dataQuality.completionRate} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Assignment Coverage</span>
                          <span>{analytics.dataQuality.assignmentCoverage}%</span>
                        </div>
                        <Progress value={analytics.dataQuality.assignmentCoverage} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Report Submission Rate</span>
                          <span>{analytics.dataQuality.reportSubmissionRate}%</span>
                        </div>
                        <Progress value={analytics.dataQuality.reportSubmissionRate} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Invoice Completion Rate</span>
                          <span>{analytics.dataQuality.invoiceCompletionRate}%</span>
                        </div>
                        <Progress value={analytics.dataQuality.invoiceCompletionRate} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Click "Refresh All Metrics" to load analytics data
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Company Access Verification
              </CardTitle>
              <CardDescription>
                Test and verify organization-based access controls across the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={runVerification}
                  disabled={verificationLoading}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  {verificationLoading ? 'Running Tests...' : 'Run Verification Tests'}
                </Button>
              </div>

              {verificationResults && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Test Results</h3>
                    <Badge variant={verificationResults.summary.failed === 0 ? "default" : "destructive"}>
                      {verificationResults.summary.failed === 0 ? "All Tests Passed" : "Tests Failed"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{verificationResults.summary.passed}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{verificationResults.summary.failed}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{verificationResults.summary.totalTests}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold mb-2">Test Scenarios</h4>
                    {verificationResults.scenarios.map((scenario, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{scenario.name}</h5>
                            <Badge variant={scenario.passed ? "default" : "destructive"}>
                              {scenario.passed ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              {scenario.passed ? "Passed" : "Failed"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                          <p className="text-sm">{scenario.details}</p>
                          <div className="text-xs text-muted-foreground mt-2">
                            Execution time: {scenario.executionTime}ms
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <h4 className="font-semibold mb-2 mt-6">Company Access Results</h4>
                    {verificationResults.companyResults.map((company, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{company.companyName}</h5>
                            <Badge variant="outline">
                              {company.userCount} users, {company.workOrderCount} orders
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span>Work Order Access</span>
                              <Badge variant={company.accessValidation.allUsersCanSeeCompanyWorkOrders ? "default" : "destructive"} className="text-xs">
                                {company.accessValidation.allUsersCanSeeCompanyWorkOrders ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Individual Assignments</span>
                              <Badge variant={company.accessValidation.individualAssignmentsWork ? "default" : "destructive"} className="text-xs">
                                {company.accessValidation.individualAssignmentsWork ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Cross-Company Privacy</span>
                              <Badge variant={company.accessValidation.crossCompanyPrivacy ? "default" : "destructive"} className="text-xs">
                                {company.accessValidation.crossCompanyPrivacy ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Statistics Access</span>
                              <Badge variant={company.accessValidation.companyStatistics ? "default" : "destructive"} className="text-xs">
                                {company.accessValidation.companyStatistics ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(performance).map(([operation, metrics]) => (
                <Card key={operation}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      {operation.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Average Time</span>
                        <Badge variant={metrics.averageTime > 1000 ? "destructive" : "default"}>
                          {metrics.averageTime < 1000 ? `${metrics.averageTime}ms` : `${(metrics.averageTime / 1000).toFixed(1)}s`}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Min Time</span>
                        <span className="font-mono text-sm">
                          {metrics.minTime < 1000 ? `${metrics.minTime}ms` : `${(metrics.minTime / 1000).toFixed(1)}s`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Time</span>
                        <span className="font-mono text-sm">
                          {metrics.maxTime < 1000 ? `${metrics.maxTime}ms` : `${(metrics.maxTime / 1000).toFixed(1)}s`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operations</span>
                        <span className="font-mono text-sm">{metrics.count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Click "Refresh All Metrics" to load performance data
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Impersonation Tab */}
        <TabsContent value="impersonation" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevTools;