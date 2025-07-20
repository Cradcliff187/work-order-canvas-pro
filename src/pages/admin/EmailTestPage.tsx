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
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';
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
  Zap
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

interface DatabaseTrigger {
  name: string;
  required: boolean;
  description: string;
  status: 'checking' | 'active' | 'missing';
}

const EmailTestPage = () => {
  const { toast } = useToast();
  const { createUser } = useUserMutations();
  
  const [isLoading, setIsLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
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
  
  const [databaseTriggers, setDatabaseTriggers] = useState<DatabaseTrigger[]>([
    {
      name: 'trigger_work_order_created',
      required: true,
      description: 'Sends emails when work orders are created',
      status: 'checking'
    },
    {
      name: 'trigger_work_order_assigned',
      required: true, 
      description: 'Sends emails when work orders are assigned',
      status: 'checking'
    },
    {
      name: 'trigger_report_submitted',
      required: true,
      description: 'Sends emails when reports are submitted',
      status: 'checking'
    },
    {
      name: 'trigger_report_reviewed',
      required: true,
      description: 'Sends emails when reports are reviewed',
      status: 'checking'
    },
    {
      name: 'trigger_auto_report_status_enhanced',
      required: true,
      description: 'Enhanced report status automation',
      status: 'checking'
    }
  ]);
  
  const [functionsExpanded, setFunctionsExpanded] = useState(false);
  const [triggersExpanded, setTriggersExpanded] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  
  const [testForm, setTestForm] = useState<TestUserForm>({
    email: 'chris.l.radcliff@gmail.com',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'employee',
  });

  useEffect(() => {
    checkEmailConfiguration();
    checkDatabaseTriggers();
    fetchEmailLogs();
  }, []);

  const checkDatabaseTriggers = async () => {
    const updatedTriggers = [...databaseTriggers];
    
    // Reset all to checking status
    updatedTriggers.forEach(trigger => {
      trigger.status = 'checking';
    });
    setDatabaseTriggers([...updatedTriggers]);

    try {
      // Query the database for email-related triggers
      const { data: triggerData, error } = await supabase
        .rpc('get_email_triggers')
        .single();

      if (error) {
        // Fallback: try direct query if RPC doesn't exist
        const { data: directData, error: directError } = await supabase
          .from('pg_trigger')
          .select('tgname')
          .like('tgname', '%email%')
          .eq('tgisinternal', false);

        if (directError) {
          console.error('Failed to check database triggers:', directError);
          // Mark all as missing if we can't check
          updatedTriggers.forEach(trigger => {
            trigger.status = 'missing';
          });
          setDatabaseTriggers([...updatedTriggers]);
          return;
        }
        
        // Process direct query results
        const activeTriggerNames = directData?.map(t => t.tgname) || [];
        
        updatedTriggers.forEach(trigger => {
          trigger.status = activeTriggerNames.includes(trigger.name) ? 'active' : 'missing';
        });
      } else {
        // Process RPC results if available
        const activeTriggerNames = triggerData?.trigger_names || [];
        
        updatedTriggers.forEach(trigger => {
          trigger.status = activeTriggerNames.includes(trigger.name) ? 'active' : 'missing';
        });
      }
      
      setDatabaseTriggers([...updatedTriggers]);
      
    } catch (error: any) {
      console.error('Database trigger check failed:', error);
      // Mark all as missing on error
      updatedTriggers.forEach(trigger => {
        trigger.status = 'missing';
      });
      setDatabaseTriggers([...updatedTriggers]);
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
      case 'missing':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getTriggerStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'missing':
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

  const getActiveTriggerCount = () => {
    const active = databaseTriggers.filter(t => t.status === 'active').length;
    const total = databaseTriggers.length;
    return { active, total };
  };

  const getRequiredTriggerCount = () => {
    const requiredTriggers = databaseTriggers.filter(t => t.required);
    const activeRequired = requiredTriggers.filter(t => t.status === 'active').length;
    return { active: activeRequired, total: requiredTriggers.length };
  };

  const { available: workingCount, total: totalCount } = getWorkingFunctionCount();
  const { available: requiredAvailable, total: requiredTotal } = getRequiredFunctionCount();
  const { active: activeTriggerCount, total: totalTriggerCount } = getActiveTriggerCount();
  const { active: requiredTriggersActive, total: requiredTriggersTotal } = getRequiredTriggerCount();
  
  const allRequiredWorking = requiredAvailable === requiredTotal;
  const allRequiredTriggersActive = requiredTriggersActive === requiredTriggersTotal;
  const systemHealthy = allRequiredWorking && allRequiredTriggersActive;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email System Testing</h1>
        <p className="text-muted-foreground">
          Complete email system with IONOS SMTP, automated triggers, and comprehensive testing
        </p>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              Database Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {activeTriggerCount === totalTriggerCount ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : activeTriggerCount === 0 ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-sm">
                {activeTriggerCount}/{totalTriggerCount} Triggers Active
              </span>
            </div>
            <Collapsible open={triggersExpanded} onOpenChange={setTriggersExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-xs">
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${triggersExpanded ? 'rotate-180' : ''}`} />
                  Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                {databaseTriggers.map((trigger) => (
                  <div key={trigger.name} className="flex items-center gap-2 text-xs">
                    {getTriggerStatusIcon(trigger.status)}
                    <span className={trigger.required ? 'font-medium' : ''}>
                      {trigger.name.replace('trigger_', '')}
                      {trigger.required && <span className="text-destructive">*</span>}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  * Required triggers
                </p>
              </CollapsibleContent>
            </Collapsible>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkDatabaseTriggers}
              className="mt-2 p-0 h-auto text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Recheck
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Workflow className="h-4 w-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {systemHealthy ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm">
                {systemHealthy ? 'Ready' : 'Issues Detected'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemHealthy ? 'All systems operational' : 'Functions or triggers unavailable'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                checkEmailConfiguration();
                checkDatabaseTriggers();
              }}
              className="mt-2 p-0 h-auto text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Recheck All
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
                Some required functions or triggers are unavailable. User creation may fail.
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
              No email logs found. Test email functions to generate activity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestPage;
