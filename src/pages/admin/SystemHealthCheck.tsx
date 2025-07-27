import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EmailQueueStatus } from '@/components/admin/EmailQueueStatus';
import { EmailFailedManager } from '@/components/admin/EmailFailedManager';
import { OrganizationHealthTab } from '@/components/admin/system-health/OrganizationHealthTab';
import { DataIntegrityTab } from '@/components/admin/system-health/DataIntegrityTab';
import { DatabasePerformanceTab } from '@/components/admin/system-health/DatabasePerformanceTab';
import { MessagingSystemTab } from '@/components/admin/system-health/MessagingSystemTab';
import { ActiveIssuesTab } from '@/components/admin/system-health/ActiveIssuesTab';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { StandardDashboardStats } from '@/components/dashboard/StandardDashboardStats';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Clock,
  Users,
  Building2,
  ClipboardList,
  Mail,
  Database,
  Shield,
  Loader2
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

interface HelperFunctionTest {
  function: string;
  expected: string;
  actual: any;
  status: 'success' | 'error';
}

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  created_at: string;
  user_id: string | null;
}

const SystemHealthCheck = () => {
  const { profile } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [helperFunctionTests, setHelperFunctionTests] = useState<HelperFunctionTest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [lastTestRun, setLastTestRun] = useState<string | null>(null);

  const runHelperFunctionTests = async (): Promise<HelperFunctionTest[]> => {
    const tests: HelperFunctionTest[] = [];
    
    try {
      // Test JWT metadata sync function
      const { data: syncResult } = await supabase.rpc('trigger_jwt_metadata_sync');
      tests.push({
        function: 'trigger_jwt_metadata_sync()',
        expected: 'JWT metadata sync success',
        actual: syncResult,
        status: (syncResult as any)?.success ? 'success' : 'error'
      });

    } catch (error) {
      console.error('Helper function tests failed:', error);
    }

    return tests;
  };

  const fetchCurrentUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const userInfo = {
        auth_uid: user?.id,
        email: user?.email,
        profile: profile,
        created_at: user?.created_at
      };

      setCurrentUserInfo(userInfo);
      return userInfo;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAuditLogs(data || []);
      return data;
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  };

  const runAuditSystemTests = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    let testOrgId: string | null = null;
    let testWorkOrderId: string | null = null;

    try {
      // Clean up any existing test data first
      await supabase
        .from('work_orders')
        .delete()
        .like('title', 'SYSTEM_TEST_%');
      
      await supabase
        .from('organizations')
        .delete()
        .eq('name', 'SYSTEM_TEST_ORG');

      // Test 1: Create test organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'SYSTEM_TEST_ORG',
          contact_email: 'test@example.com'
        })
        .select()
        .single();

      if (orgError || !newOrg) {
        results.push({
          name: 'Create Test Organization',
          status: 'error',
          message: `Failed to create test org: ${orgError?.message}`
        });
      } else {
        testOrgId = newOrg.id;
        results.push({
          name: 'Create Test Organization',
          status: 'success',
          message: `Created org with ID: ${testOrgId}`
        });
      }

      // Test 2: Update test organization
      if (testOrgId) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ contact_phone: '+1234567890' })
          .eq('id', testOrgId);

        results.push({
          name: 'Update Test Organization',
          status: updateError ? 'error' : 'success',
          message: updateError ? `Update failed: ${updateError.message}` : 'Organization updated successfully'
        });
      }

      // Test 3: Create test work order
      if (testOrgId) {
        const { data: newWorkOrder, error: woError } = await supabase
          .from('work_orders')
          .insert({
            title: 'SYSTEM_TEST_WORK_ORDER',
            organization_id: testOrgId,
            created_by: profile?.id || ''
          })
          .select()
          .single();

        if (woError || !newWorkOrder) {
          results.push({
            name: 'Create Test Work Order',
            status: 'error',
            message: `Failed to create work order: ${woError?.message}`
          });
        } else {
          testWorkOrderId = newWorkOrder.id;
          results.push({
            name: 'Create Test Work Order',
            status: 'success',
            message: `Created work order with ID: ${testWorkOrderId}`
          });
        }
      }

      // Test 4: Update work order status
      if (testWorkOrderId) {
        const { error: statusError } = await supabase
          .from('work_orders')
          .update({ status: 'assigned' })
          .eq('id', testWorkOrderId);

        results.push({
          name: 'Update Work Order Status',
          status: statusError ? 'error' : 'success',
          message: statusError ? `Status update failed: ${statusError.message}` : 'Work order status updated successfully'
        });
      }

      // Test 5: Check audit logs were created
      const auditData = await fetchAuditLogs();
      const recentTestLogs = auditData?.filter(log => 
        (log.table_name === 'organizations' || log.table_name === 'work_orders') &&
        new Date(log.created_at) > new Date(Date.now() - 60000) // Last minute
      ) || [];

      results.push({
        name: 'Verify Audit Logs Created',
        status: recentTestLogs.length > 0 ? 'success' : 'warning',
        message: `Found ${recentTestLogs.length} recent audit log entries`,
        data: recentTestLogs
      });

      // Cleanup test data
      if (testWorkOrderId) {
        await supabase.from('work_orders').delete().eq('id', testWorkOrderId);
      }
      if (testOrgId) {
        await supabase.from('organizations').delete().eq('id', testOrgId);
      }

      results.push({
        name: 'Cleanup Test Data',
        status: 'success',
        message: 'Test data cleaned up successfully'
      });

    } catch (error) {
      results.push({
        name: 'Audit System Test',
        status: 'error',
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      // Attempt cleanup even on error
      try {
        if (testWorkOrderId) {
          await supabase.from('work_orders').delete().eq('id', testWorkOrderId);
        }
        if (testOrgId) {
          await supabase.from('organizations').delete().eq('id', testOrgId);
        }
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }

    return results;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setHelperFunctionTests([]);

    try {
      // Fetch current user info
      await fetchCurrentUserInfo();

      // Run helper function tests
      const helperTests = await runHelperFunctionTests();
      setHelperFunctionTests(helperTests);

      // Run audit system tests
      const auditTests = await runAuditSystemTests();
      setTestResults(auditTests);

      // Refresh audit logs
      await fetchAuditLogs();

      setLastTestRun(new Date().toISOString());
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'warning') => {
    const variant = status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const { metrics, isLoading: metricsLoading } = useSystemMetrics();

  const getMetricStats = () => {
    if (!metrics) return [];

    return [
      {
        icon: Users,
        label: metrics.activeUsers.label,
        value: metrics.activeUsers.value,
        description: metrics.activeUsers.change,
        variant: (metrics.activeUsers.status === 'healthy' ? 'success' : 
               metrics.activeUsers.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: Building2,
        label: metrics.organizations.label,
        value: metrics.organizations.value,
        description: metrics.organizations.change,
        variant: (metrics.organizations.status === 'healthy' ? 'success' : 
               metrics.organizations.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: ClipboardList,
        label: metrics.workOrders.label,
        value: metrics.workOrders.value,
        description: metrics.workOrders.change,
        variant: (metrics.workOrders.status === 'healthy' ? 'success' : 
               metrics.workOrders.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      },
      {
        icon: Mail,
        label: metrics.emailQueue.label,
        value: metrics.emailQueue.value,
        description: metrics.emailQueue.change,
        variant: (metrics.emailQueue.status === 'healthy' ? 'success' : 
               metrics.emailQueue.status === 'warning' ? 'warning' : 'destructive') as 'default' | 'warning' | 'success' | 'destructive'
      }
    ];
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Health</h1>
        <p className="text-muted-foreground">Technical monitoring and system status</p>
      </div>

      {/* System Metrics Overview */}
      <div className="mb-8">
        <StandardDashboardStats 
          stats={getMetricStats()} 
          loading={metricsLoading}
          className="mb-6"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="organization">Organization & Users</TabsTrigger>
          <TabsTrigger value="data-integrity">Data Integrity</TabsTrigger>
          <TabsTrigger value="database-performance">Database Performance</TabsTrigger>
          <TabsTrigger value="messaging-system">Messaging System</TabsTrigger>
          <TabsTrigger value="active-issues">Active Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Email Queue Automation */}
          <Card>
            <CardHeader>
              <CardTitle>Email Queue Automation</CardTitle>
              <CardDescription>
                Monitor email queue status and automated processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailQueueStatus />
            </CardContent>
          </Card>

          {/* Failed Email Management */}
          <div>
            <EmailFailedManager />
          </div>

          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Test Control Panel
              </CardTitle>
              <CardDescription>
                Run comprehensive tests to verify system functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Button 
                    onClick={runAllTests} 
                    disabled={isRunning}
                    className="flex items-center gap-2"
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    Run All Tests
                  </Button>
                  {lastTestRun && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Last run: {new Date(lastTestRun).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Current User Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentUserInfo ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Auth UID:</span>
                      <span className="text-sm font-mono">{currentUserInfo.auth_uid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span className="text-sm">{currentUserInfo.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Profile ID:</span>
                      <span className="text-sm font-mono">{currentUserInfo.profile?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">User Type:</span>
                      <Badge>{currentUserInfo.profile?.user_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Full Name:</span>
                      <span className="text-sm">{currentUserInfo.profile?.first_name} {currentUserInfo.profile?.last_name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Run tests to fetch user information
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Helper Function Tests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Helper Function Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {helperFunctionTests.length > 0 ? (
                  <div className="space-y-3">
                    {helperFunctionTests.map((test, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{test.function}</p>
                          <p className="text-xs text-muted-foreground">
                            Result: {JSON.stringify(test.actual)}
                          </p>
                        </div>
                        {getStatusIcon(test.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No tests run yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Audit System Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length > 0 ? (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(result.status)}
                          <h4 className="font-medium">{result.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">View Details</summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No test results yet. Click "Run All Tests" to begin.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Audit Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Audit Logs
              </CardTitle>
              <CardDescription>
                Last 10 audit log entries from the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Record ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline">{log.table_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action === 'INSERT' ? 'default' : log.action === 'UPDATE' ? 'secondary' : 'destructive'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.record_id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.user_id ? log.user_id.slice(0, 8) + '...' : 'null'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No audit logs found. Run tests to generate audit entries.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationHealthTab />
        </TabsContent>

        <TabsContent value="data-integrity">
          <DataIntegrityTab />
        </TabsContent>

        <TabsContent value="database-performance">
          <DatabasePerformanceTab />
        </TabsContent>

        <TabsContent value="messaging-system">
          <MessagingSystemTab />
        </TabsContent>

        <TabsContent value="active-issues">
          <ActiveIssuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthCheck;