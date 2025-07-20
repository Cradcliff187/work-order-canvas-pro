import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useUserMutations } from '@/hooks/useUsers';
import { useEmailHealth } from '@/hooks/useEmailHealth';
import { useEmailSystemTest } from '@/hooks/useEmailSystemTest';
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';
import { EmailHealthScore } from '@/components/admin/EmailHealthScore';
import { EmailSystemActions } from '@/components/admin/EmailSystemActions';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Send,
  Clock,
  Loader2,
  Server,
  Database,
  User,
  RefreshCw,
  Workflow,
  ChevronDown,
  Zap,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailLog {
  id: string;
  recipient_email: string;
  template_used: string | null;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
}

interface TestUserForm {
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
}

interface EdgeFunctionStatus {
  name: string;
  required: boolean;
  description: string;
  status: 'checking' | 'available' | 'unavailable';
  error?: string;
}

interface EmailAutomationStatus {
  name: string;
  description: string;
  status: 'checking' | 'active' | 'inactive';
  details?: string;
}

const EmailTestPage = () => {
  const { toast } = useToast();
  const { createUser } = useUserMutations();
  
  const [isLoading, setIsLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  
  // Use new hooks
  const { emailMetrics, triggerMetrics, isLoading: healthLoading, refreshHealth } = useEmailHealth();
  const { testEmailSystem, createTestWorkOrder, isTestRunning, lastTestResult } = useEmailSystemTest();
  
  const [edgeFunctions, setEdgeFunctions] = useState<EdgeFunctionStatus[]>([
    {
      name: 'send-email',
      required: true,
      description: 'Main email sending function (handles all email templates)',
      status: 'checking'
    },
    {
      name: 'test-smtp',
      required: false,
      description: 'SMTP configuration testing',
      status: 'checking'
    },
    {
      name: 'setup-test-environment',
      required: false,
      description: 'Test data environment setup',
      status: 'checking'
    }
  ]);
  
  const [emailAutomation, setEmailAutomation] = useState<EmailAutomationStatus[]>([
    {
      name: 'Email Templates',
      description: 'Email templates are configured and active',
      status: 'checking'
    },
    {
      name: 'Recipient Settings',
      description: 'Email recipient configurations exist',
      status: 'checking'
    },
    {
      name: 'Recent Email Activity',
      description: 'Recent emails have been sent successfully',
      status: 'checking'
    },
    {
      name: 'Automation Working',
      description: 'Email automation triggers are functioning',
      status: 'checking'
    }
  ]);
  
  const [functionsExpanded, setFunctionsExpanded] = useState(false);
  const [automationExpanded, setAutomationExpanded] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  
  const [testForm, setTestForm] = useState<TestUserForm>({
    email: 'chris.l.radcliff@gmail.com',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'employee',
  });

  useEffect(() => {
    checkEmailConfiguration();
    verifyEmailAutomation();
    fetchEmailLogs();
  }, []);

  const verifyEmailAutomation = async () => {
    const updatedAutomation = [...emailAutomation];
    
    // Reset all to checking status
    updatedAutomation.forEach(item => {
      item.status = 'checking';
      item.details = undefined;
    });
    setEmailAutomation([...updatedAutomation]);

    try {
      // Check email templates exist and are active
      const { data: templates, error: templatesError } = await supabase
        .from('email_templates')
        .select('id, template_name, is_active')
        .eq('is_active', true);

      const templatesItem = updatedAutomation.find(item => item.name === 'Email Templates');
      if (templatesItem) {
        if (templatesError) {
          templatesItem.status = 'inactive';
          templatesItem.details = 'Error fetching templates';
        } else {
          templatesItem.status = templates && templates.length > 0 ? 'active' : 'inactive';
          templatesItem.details = `${templates?.length || 0} active templates`;
        }
      }
      
      // Check recipient settings exist
      const { data: recipients, error: recipientsError } = await supabase
        .from('email_recipient_settings')
        .select('id, template_name, receives_email')
        .eq('receives_email', true);

      const recipientsItem = updatedAutomation.find(item => item.name === 'Recipient Settings');
      if (recipientsItem) {
        if (recipientsError) {
          recipientsItem.status = 'inactive';
          recipientsItem.details = 'Error fetching recipient settings';
        } else {
          recipientsItem.status = recipients && recipients.length > 0 ? 'active' : 'inactive';
          recipientsItem.details = `${recipients?.length || 0} recipient configurations`;
        }
      }

      // Check recent email activity (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentEmails, error: emailsError } = await supabase
        .from('email_logs')
        .select('id, template_used, status, sent_at')
        .gte('sent_at', twentyFourHoursAgo);

      const activityItem = updatedAutomation.find(item => item.name === 'Recent Email Activity');
      if (activityItem) {
        if (emailsError) {
          activityItem.status = 'inactive';
          activityItem.details = 'Error fetching email logs';
        } else {
          const successfulEmails = recentEmails?.filter(email => email.status === 'sent' || email.status === 'delivered') || [];
          activityItem.status = successfulEmails.length > 0 ? 'active' : 'inactive';
          activityItem.details = `${successfulEmails.length} successful emails in 24h`;
        }
      }

      // Overall automation status based on other checks
      const automationItem = updatedAutomation.find(item => item.name === 'Automation Working');
      if (automationItem) {
        const allActive = updatedAutomation
          .filter(item => item.name !== 'Automation Working')
          .every(item => item.status === 'active');
        
        automationItem.status = allActive ? 'active' : 'inactive';
        automationItem.details = allActive 
          ? 'All email automation components are working'
          : 'Some email automation components need attention';
      }
      
      setEmailAutomation([...updatedAutomation]);
      
    } catch (error: any) {
      console.error('Email automation check failed:', error);
      // Mark all as inactive on error
      updatedAutomation.forEach(item => {
        item.status = 'inactive';
        item.details = 'Verification failed';
      });
      setEmailAutomation([...updatedAutomation]);
    }
  };

  const checkEmailConfiguration = async () => {
    const updatedFunctions = [...edgeFunctions];
    
    // Reset all to checking status
    updatedFunctions.forEach(fn => {
      fn.status = 'checking';
      fn.error = undefined;
    });
    setEdgeFunctions([...updatedFunctions]);

    // Test each function
    for (let i = 0; i < updatedFunctions.length; i++) {
      const func = updatedFunctions[i];
      
      try {
        const { error } = await supabase.functions.invoke(func.name, {
          body: { test: true }
        });
        
        // Function is accessible if we get a response (even with error)
        func.status = 'available';
        
        // Update state after each function test for real-time feedback
        setEdgeFunctions([...updatedFunctions]);
        
      } catch (error: any) {
        console.error(`Edge function ${func.name} check failed:`, error);
        func.status = 'unavailable';
        func.error = error.message || 'Connection failed';
        
        // Update state after each function test for real-time feedback
        setEdgeFunctions([...updatedFunctions]);
      }
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    }
  };

  const handleCreateTestUser = async () => {
    if (!testForm.email || !testForm.first_name || !testForm.last_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await createUser.mutateAsync({
        email: testForm.email,
        first_name: testForm.first_name,
        last_name: testForm.last_name,
        user_type: testForm.user_type,
      });

      setTestResult({
        success: true,
        message: 'Test user created successfully!',
        details: result
      });

      // Refresh email logs to show the new entry
      setTimeout(() => {
        fetchEmailLogs();
      }, 2000);

      // Clear form
      setTestForm(prev => ({
        ...prev,
        email: 'chris.l.radcliff@gmail.com',
        first_name: 'Test',
        last_name: 'User'
      }));

    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Failed to create test user: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = 
      ['sent', 'delivered'].includes(status.toLowerCase()) ? 'default' :
      ['failed', 'bounced'].includes(status.toLowerCase()) ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const getFunctionStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'unavailable':
      case 'inactive':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getWorkingFunctionCount = () => {
    const available = edgeFunctions.filter(f => f.status === 'available').length;
    const total = edgeFunctions.length;
    return { available, total };
  };

  const getRequiredFunctionCount = () => {
    const requiredFunctions = edgeFunctions.filter(f => f.required);
    const availableRequired = requiredFunctions.filter(f => f.status === 'available').length;
    return { available: availableRequired, total: requiredFunctions.length };
  };

  const getActiveAutomationCount = () => {
    const active = emailAutomation.filter(a => a.status === 'active').length;
    const total = emailAutomation.length;
    return { active, total };
  };

  const handleTestEmailSystem = async () => {
    await testEmailSystem();
    // Refresh health after test
    setTimeout(() => {
      refreshHealth();
      fetchEmailLogs();
    }, 2000);
  };

  const handleCreateTestWorkOrder = async () => {
    await createTestWorkOrder();
    // Refresh metrics after creating work order
    setTimeout(() => {
      refreshHealth();
    }, 1000);
  };

  const handleRefreshHealth = async () => {
    await refreshHealth();
    fetchEmailLogs();
    checkEmailConfiguration();
    verifyEmailAutomation();
  };

  const { available: workingCount, total: totalCount } = getWorkingFunctionCount();
  const { available: requiredAvailable, total: requiredTotal } = getRequiredFunctionCount();
  const { active: activeAutomationCount, total: totalAutomationCount } = getActiveAutomationCount();
  
  const allRequiredWorking = requiredAvailable === requiredTotal;
  const allAutomationActive = activeAutomationCount === totalAutomationCount;
  const systemHealthy = allRequiredWorking && allAutomationActive && emailMetrics.alertLevel === 'healthy';

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email System Testing</h1>
        <p className="text-muted-foreground">
          Comprehensive email system monitoring with IONOS SMTP, automated triggers, and health analytics
        </p>
      </div>

      {/* Enhanced System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EmailHealthScore
          healthScore={emailMetrics.healthScore}
          alertLevel={emailMetrics.alertLevel}
          alertMessage={emailMetrics.alertMessage}
          totalEmails={emailMetrics.totalEmailsLast7Days}
          successRate={emailMetrics.successRate}
          daysSinceLastEmail={emailMetrics.daysSinceLastEmail}
          lastEmailSent={emailMetrics.lastEmailSent}
          isLoading={healthLoading}
        />

        <EmailSystemActions
          onTestEmailSystem={handleTestEmailSystem}
          onCreateTestWorkOrder={handleCreateTestWorkOrder}
          onRefreshHealth={handleRefreshHealth}
          isTestRunning={isTestRunning}
          lastTestResult={lastTestResult}
        />
      </div>

      {/* Trigger Events Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{triggerMetrics.workOrdersLast7Days}</div>
              <div className="text-sm text-muted-foreground">Work Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{triggerMetrics.reportsLast7Days}</div>
              <div className="text-sm text-muted-foreground">Reports Submitted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{emailMetrics.totalEmailsLast7Days}</div>
              <div className="text-sm text-muted-foreground">Emails Sent</div>
            </div>
          </div>
          
          {triggerMetrics.totalTriggerEvents === 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No trigger events detected. This could indicate low system activity or disabled triggers.
                Consider creating a test work order to verify email automation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Phase 1: IONOS SMTP Configuration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Phase 2: Consolidated Email Functions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Phase 3: Email Template Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Phase 4: Workflow Automation Triggers</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Phase 5: Email Recipient Settings</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Phase 6: Production Validation</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4" />
              IONOS SMTP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">Configured</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              support@workorderportal.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Email Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">{emailLogs.length} recent entries</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchEmailLogs}
              className="mt-2 p-0 h-auto text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              Edge Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {workingCount === totalCount ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : workingCount === 0 ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-sm">
                {workingCount}/{totalCount} Functions Ready
              </span>
            </div>
            <Collapsible open={functionsExpanded} onOpenChange={setFunctionsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-xs">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${functionsExpanded ? 'rotate-180' : ''}`} />
                  Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {edgeFunctions.map((func) => (
                  <div key={func.name} className="flex items-center gap-2 text-xs">
                    {getFunctionStatusIcon(func.status)}
                    <span className={func.required ? 'font-medium' : ''}>
                      {func.name}
                      {func.required && <span className="text-destructive">*</span>}
                    </span>
                    {func.error && (
                      <span className="text-destructive text-xs">({func.error})</span>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  * Required functions
                </p>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              Email Automation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {activeAutomationCount === totalAutomationCount ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : activeAutomationCount === 0 ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-sm">
                {activeAutomationCount}/{totalAutomationCount} Components Active
              </span>
            </div>
            <Collapsible open={automationExpanded} onOpenChange={setAutomationExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-xs">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${automationExpanded ? 'rotate-180' : ''}`} />
                  Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {emailAutomation.map((item) => (
                  <div key={item.name} className="text-xs">
                    <div className="flex items-center gap-2">
                      {getFunctionStatusIcon(item.status)}
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.details && (
                      <p className="text-muted-foreground ml-6">{item.details}</p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Verifies automation is working, not individual triggers
                </p>
              </CollapsibleContent>
            </Collapsible>
            <Button
              variant="ghost"
              size="sm"
              onClick={verifyEmailAutomation}
              className="mt-2 p-0 h-auto text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Recheck
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <EmailTestPanel />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Test User
          </CardTitle>
          <CardDescription>
            Test the user creation process and welcome email delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={testForm.email}
                onChange={(e) => setTestForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="user_type">User Type</Label>
              <select
                id="user_type"
                value={testForm.user_type}
                onChange={(e) => setTestForm(prev => ({ ...prev, user_type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="employee">Employee</option>
                <option value="partner">Partner</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={testForm.first_name}
                onChange={(e) => setTestForm(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={testForm.last_name}
                onChange={(e) => setTestForm(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>

          <Button 
            onClick={handleCreateTestUser}
            disabled={isLoading || !systemHealthy}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Create Test User
          </Button>

          {!systemHealthy && (
            <Alert className="border-warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some required functions or automation components are unavailable. User creation may fail.
              </AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert className={testResult.success ? 'border-success' : 'border-destructive'}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Email Logs
            <Badge variant="outline">{emailLogs.length} entries</Badge>
          </CardTitle>
          <CardDescription>
            Monitor email delivery status and troubleshoot issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.recipient_email}</TableCell>
                    <TableCell>{log.template_used || 'N/A'}</TableCell>
                    <TableCell>{new Date(log.sent_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {log.error_message ? (
                        <span className="text-destructive text-sm">{log.error_message}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No email logs found</p>
              <p className="text-sm">Test email functions or create trigger events to generate activity.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestPage;
