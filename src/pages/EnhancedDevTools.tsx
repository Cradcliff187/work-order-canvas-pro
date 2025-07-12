import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useDevTools } from '@/hooks/useDevTools';
import { useCompanyAccessVerification } from '@/hooks/useCompanyAccessVerification';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const EnhancedDevTools = () => {
  const { profile, isImpersonating, impersonatedProfile } = useAuth();
  const { toast } = useToast();
  const {
    loading,
    counts,
    analytics,
    performance,
    fetchAllMetrics,
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
    }
  }, [isDevelopment, isAdmin]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
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
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Enhanced Development Tools</h1>
        <Badge variant="secondary">DEV MODE</Badge>
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
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
                
                <Button 
                  variant="destructive"
                  onClick={clearTestData}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Test Data
                </Button>

                <Button 
                  variant="outline" 
                  onClick={fetchAllMetrics}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Refresh All Metrics
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

        {/* Company Analytics Tab */}
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

        {/* Company Access Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Company Access Verification
              </CardTitle>
              <CardDescription>
                Run comprehensive tests to verify company-level access patterns and RLS policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Button 
                  onClick={runVerification}
                  disabled={verificationLoading}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  {verificationLoading ? 'Running Verification...' : 'Run Verification Tests'}
                </Button>
              </div>

              {verificationResults && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Verification Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {verificationResults.summary.passed}
                          </div>
                          <div className="text-sm text-muted-foreground">Passed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {verificationResults.summary.failed}
                          </div>
                          <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {verificationResults.summary.totalTests}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Tests</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatTime(verificationResults.summary.executionTime)}
                          </div>
                          <div className="text-sm text-muted-foreground">Execution Time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Test Results */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {verificationResults.scenarios.map((scenario, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {scenario.passed ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <h4 className="font-semibold">{scenario.name}</h4>
                                <Badge variant={scenario.passed ? "default" : "destructive"}>
                                  {scenario.passed ? "PASS" : "FAIL"}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatTime(scenario.executionTime)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {scenario.description}
                            </p>
                            <p className="text-sm">{scenario.details}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Company Results */}
                  {verificationResults.companyResults.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Company Verification Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {verificationResults.companyResults.map((company, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">{company.companyName}</h4>
                                <div className="flex gap-2">
                                  <Badge variant="outline">{company.userCount} users</Badge>
                                  <Badge variant="outline">{company.workOrderCount} orders</Badge>
                                  <Badge variant="outline">{company.reportCount} reports</Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  {company.accessValidation.allUsersCanSeeCompanyWorkOrders ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span>Company Access</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {company.accessValidation.individualAssignmentsWork ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span>Individual Assignments</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {company.accessValidation.crossCompanyPrivacy ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span>Privacy</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {company.accessValidation.companyStatistics ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span>Statistics</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performance ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Query Performance
                  </CardTitle>
                  <CardDescription>
                    Database query response times and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(performance.queryTimes).map(([table, time]) => (
                      <div key={table} className="text-center p-4 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{formatTime(time)}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {table.replace(/([A-Z])/g, ' $1')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Database Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {performance.databaseHealth.totalConnections}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Connections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {performance.databaseHealth.slowQueries}
                      </div>
                      <div className="text-sm text-muted-foreground">Slow Queries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {performance.databaseHealth.indexEfficiency}%
                      </div>
                      <div className="text-sm text-muted-foreground">Index Efficiency</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
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

        {/* Test Credentials Tab */}
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
              <div className="grid gap-6">
                {/* Admin Users */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="destructive">Admin</Badge>
                    Full system access
                  </h4>
                  <div className="grid gap-2">
                    {testCredentials.filter(cred => cred.email.includes('admin')).map((cred) => (
                      <div key={cred.email} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
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

                {/* Partner Users */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="default">Partner</Badge>
                    Organization-level access
                  </h4>
                  <div className="grid gap-2">
                    {testCredentials.filter(cred => cred.email.includes('partner')).map((cred) => (
                      <div key={cred.email} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
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

                {/* Subcontractor Users */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="secondary">Subcontractor</Badge>
                    Assignment-based access
                  </h4>
                  <div className="grid gap-2">
                    {testCredentials.filter(cred => 
                      !cred.email.includes('admin') && !cred.email.includes('partner')
                    ).map((cred) => (
                      <div key={cred.email} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
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
      </Tabs>
    </div>
  );
};

export default EnhancedDevTools;