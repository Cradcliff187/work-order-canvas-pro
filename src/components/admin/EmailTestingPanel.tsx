import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, CheckCircle, XCircle, Clock, Send, Database, Eye, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserMutations } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';

interface EmailTest {
  id: string;
  name: string;
  description: string;
  template_name: string;
  record_type: string;
  category: 'work_order' | 'report' | 'auth';
  status: 'idle' | 'testing' | 'success' | 'error';
  result?: string;
  error?: string;
}

export function EmailTestingPanel() {
  const [tests, setTests] = useState<EmailTest[]>([
    // Work Order Tests
    {
      id: 'work_order_created',
      name: 'Work Order Created',
      description: 'Test email sent when a new work order is created',
      template_name: 'work_order_created',
      record_type: 'work_order',
      category: 'work_order',
      status: 'idle'
    },
    {
      id: 'work_order_assigned',
      name: 'Work Order Assigned',
      description: 'Test email sent when a work order is assigned',
      template_name: 'work_order_assigned',
      record_type: 'work_order',
      category: 'work_order',
      status: 'idle'
    },
    // Report Tests
    {
      id: 'report_submitted',
      name: 'Report Submitted',
      description: 'Test email sent when a work order report is submitted',
      template_name: 'report_submitted',
      record_type: 'work_order_report',
      category: 'report',
      status: 'idle'
    },
    {
      id: 'report_reviewed',
      name: 'Report Reviewed',
      description: 'Test email sent when a report is approved/rejected',
      template_name: 'report_reviewed',
      record_type: 'work_order_report',
      category: 'report',
      status: 'idle'
    },
    // Authentication Tests
    {
      id: 'auth_confirmation',
      name: 'Auth Confirmation Email',
      description: 'Test welcome email sent when creating a new user account',
      template_name: 'auth_confirmation',
      record_type: 'auth',
      category: 'auth',
      status: 'idle'
    },
    {
      id: 'password_reset',
      name: 'Password Reset Email',
      description: 'Test password reset email functionality',
      template_name: 'password_reset',
      record_type: 'auth',
      category: 'auth',
      status: 'idle'
    }
  ]);
  
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'work_order' | 'report' | 'auth'>('all');
  const [authStats, setAuthStats] = useState<{auth_confirmation: number, password_reset: number} | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  
  const { toast } = useToast();
  const { createUser } = useUserMutations();
  const { forgotPassword } = useAuth();

  const updateTestStatus = (testId: string, status: EmailTest['status'], result?: string, error?: string) => {
    setTests(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status, result, error }
        : test
    ));
  };

  const testAuthConfirmation = async () => {
    updateTestStatus('auth_confirmation', 'testing');
    
    try {
      // Create a test user to trigger auth confirmation email
      const testEmail = testRecipient || `test-auth-${Date.now()}@workorderportal.com`;
      
      await createUser.mutateAsync({
        email: testEmail,
        first_name: 'Test',
        last_name: 'User',
        user_type: 'employee'
      });

      // Wait a moment for the email to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check email logs for auth_confirmation entry
      const { data: emailLog, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('recipient_email', testEmail)
        .eq('template_used', 'auth_confirmation')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (emailLog) {
        updateTestStatus('auth_confirmation', 'success', `Auth confirmation email sent to ${testEmail} - Status: ${emailLog.status}`);
        toast({
          title: "Auth Confirmation Test Successful",
          description: `Email sent to ${testEmail}`,
        });
      } else {
        throw new Error('Auth confirmation email not found in logs');
      }

      // Clean up test user
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', testEmail)
          .single();
        
        if (profile) {
          await supabase.from('profiles').delete().eq('id', profile.id);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup test user:', cleanupError);
      }

      await fetchEmailLogs();
      await fetchAuthStats();
      
    } catch (error) {
      console.error(`Auth confirmation test failed:`, error);
      updateTestStatus('auth_confirmation', 'error', undefined, error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Auth Confirmation Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const testPasswordReset = async () => {
    updateTestStatus('password_reset', 'testing');
    
    try {
      // Use the test recipient if provided, otherwise use a default test email
      const testEmail = testRecipient || 'test-password-reset@workorderportal.com';
      
      // Trigger password reset
      const result = await forgotPassword(testEmail);
      
      if (result.error) {
        throw new Error(result.error.message || 'Password reset failed');
      }

      // Wait a moment for the email to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check email logs for password_reset entry
      const { data: emailLog, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('recipient_email', testEmail)
        .eq('template_used', 'password_reset')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (emailLog) {
        updateTestStatus('password_reset', 'success', `Password reset email sent to ${testEmail} - Status: ${emailLog.status}`);
        toast({
          title: "Password Reset Test Successful",
          description: `Email sent to ${testEmail}`,
        });
      } else {
        throw new Error('Password reset email not found in logs');
      }

      await fetchEmailLogs();
      await fetchAuthStats();
      
    } catch (error) {
      console.error(`Password reset test failed:`, error);
      updateTestStatus('password_reset', 'error', undefined, error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Password Reset Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const testEmailTrigger = async (test: EmailTest) => {
    if (test.category === 'auth') {
      if (test.id === 'auth_confirmation') {
        await testAuthConfirmation();
      } else if (test.id === 'password_reset') {
        await testPasswordReset();
      }
      return;
    }

    updateTestStatus(test.id, 'testing');
    
    try {
      // Call the send-email edge function directly for testing work order/report emails
      const response = await supabase.functions.invoke('send-email', {
        body: {
          template_name: test.template_name,
          record_id: `TEST-${test.id.toUpperCase()}-001`,
          record_type: test.record_type,
          test_mode: Boolean(testRecipient),
          test_recipient: testRecipient || undefined,
          custom_data: testRecipient ? {
            work_order_number: 'TEST-001',
            organization_name: 'Test Organization',
            first_name: 'Test',
            last_name: 'User',
            status: 'approved',
            title: 'Test Work Order',
            review_notes: 'This is a test email'
          } : undefined
        }
      });

      if (response.error) {
        console.error('Email test response error:', response.error);
        throw new Error(response.error.message || 'Email test failed');
      }

      const result = response.data;
      
      updateTestStatus(test.id, 'success', `Email sent successfully - Recipients: ${result.recipients || 1} - Email sent to: ${testRecipient || 'template recipients'}`);
      
      toast({
        title: "Email Test Successful",
        description: `${test.name} email sent successfully to ${testRecipient || 'template recipients'}`,
      });

      await fetchEmailLogs();
      
    } catch (error) {
      console.error(`Email test failed for ${test.id}:`, error);
      updateTestStatus(test.id, 'error', undefined, error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Email Test Failed",
        description: `Failed to send ${test.name} email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
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

  const fetchAuthStats = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('template_used')
        .in('template_used', ['auth_confirmation', 'password_reset'])
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        auth_confirmation: data?.filter(log => log.template_used === 'auth_confirmation').length || 0,
        password_reset: data?.filter(log => log.template_used === 'password_reset').length || 0
      };

      setAuthStats(stats);
    } catch (error) {
      console.error('Failed to fetch auth stats:', error);
    }
  };

  const runAllTests = async () => {
    const filteredTests = filterCategory === 'all' ? tests : tests.filter(t => t.category === filterCategory);
    
    for (const test of filteredTests) {
      await testEmailTrigger(test);
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const runCategoryTests = async (category: 'work_order' | 'report' | 'auth') => {
    const categoryTests = tests.filter(t => t.category === category);
    
    for (const test of categoryTests) {
      await testEmailTrigger(test);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const getStatusIcon = (status: EmailTest['status']) => {
    switch (status) {
      case 'testing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: EmailTest['status']) => {
    switch (status) {
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Shield className="h-4 w-4" />;
      case 'work_order':
        return <Mail className="h-4 w-4" />;
      case 'report':
        return <Database className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const filteredTests = filterCategory === 'all' ? tests : tests.filter(t => t.category === filterCategory);
  const filteredLogs = filterCategory === 'all' ? emailLogs : 
    emailLogs.filter(log => {
      if (filterCategory === 'auth') {
        return ['auth_confirmation', 'password_reset'].includes(log.template_used);
      }
      if (filterCategory === 'work_order') {
        return ['work_order_created', 'work_order_assigned'].includes(log.template_used);
      }
      if (filterCategory === 'report') {
        return ['report_submitted', 'report_reviewed'].includes(log.template_used);
      }
      return true;
    });

  React.useEffect(() => {
    fetchEmailLogs();
    fetchAuthStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Email System Testing
          </CardTitle>
          <CardDescription>
            Test all email triggers to ensure the unified email system is working correctly.
            This includes authentication, work order, and report email functionality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Recipient Input */}
          <div className="space-y-2">
            <Label htmlFor="test-recipient">Test Recipient Email (Optional)</Label>
            <Input
              id="test-recipient"
              type="email"
              placeholder="your-email@example.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to use template default recipients, or enter your email to receive test emails directly.
            </p>
          </div>
          
          <Separator />

          {/* Category Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Filter by Category:</h3>
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'All', icon: Mail },
                  { key: 'auth', label: 'Auth', icon: Shield },
                  { key: 'work_order', label: 'Work Orders', icon: Mail },
                  { key: 'report', label: 'Reports', icon: Database }
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={filterCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterCategory(key as any)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={runAllTests} disabled={tests.some(t => t.status === 'testing')} size="sm">
                <Send className="h-4 w-4 mr-2" />
                Run All Tests
              </Button>
            </div>
          </div>

          {/* Category-specific Test Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => runCategoryTests('auth')}
              disabled={tests.some(t => t.status === 'testing')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Test Auth Emails
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => runCategoryTests('work_order')}
              disabled={tests.some(t => t.status === 'testing')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Test Work Orders
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => runCategoryTests('report')}
              disabled={tests.some(t => t.status === 'testing')}
            >
              <Database className="h-4 w-4 mr-2" />
              Test Reports
            </Button>
          </div>

          {/* Auth Statistics */}
          {authStats && (filterCategory === 'auth' || filterCategory === 'all') && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-2">Auth Email Statistics (Last 24 Hours)</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Confirmation Emails:</span>
                  <span className="ml-2 font-medium">{authStats.auth_confirmation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Password Resets:</span>
                  <span className="ml-2 font-medium">{authStats.password_reset}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {filteredTests.map((test) => (
              <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getCategoryIcon(test.category)}
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">{test.description}</div>
                    {test.result && (
                      <div className="text-xs text-green-600 mt-1">{test.result}</div>
                    )}
                    {test.error && (
                      <div className="text-xs text-red-600 mt-1">{test.error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(test.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testEmailTrigger(test)}
                    disabled={test.status === 'testing'}
                  >
                    Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Email Logs
          </CardTitle>
          <CardDescription>
            Recent email delivery logs from the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Recent Email Activity</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowLogs(!showLogs)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </Button>
          </div>
          
          {showLogs && (
            <div className="space-y-2">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {getCategoryIcon(
                            ['auth_confirmation', 'password_reset'].includes(log.template_used) ? 'auth' :
                            ['work_order_created', 'work_order_assigned'].includes(log.template_used) ? 'work_order' : 'report'
                          )}
                          {log.template_used}
                        </div>
                        <div className="text-muted-foreground">To: {log.recipient_email}</div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={log.status === 'sent' ? 'default' : log.status === 'delivered' ? 'default' : 'destructive'}
                          className={log.status === 'delivered' ? 'bg-green-500' : ''}
                        >
                          {log.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(log.sent_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {log.error_message && (
                      <div className="text-xs text-red-600 mt-2">
                        Error: {log.error_message}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No email logs found for {filterCategory === 'all' ? 'any category' : filterCategory}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Email System Status:</p>
            <div className="text-sm space-y-1">
              <p>• <strong>Authentication Emails:</strong> User welcome emails and password resets</p>
              <p>• <strong>Work Order Emails:</strong> Creation and assignment notifications</p>
              <p>• <strong>Report Emails:</strong> Submission and review notifications</p>
              <p>• <strong>Delivery:</strong> All emails sent via Resend with delivery tracking</p>
              <p>• <strong>Test Mode:</strong> Enter your email above to receive test emails directly</p>
              <p>• <strong>Domain:</strong> Using workorderportal.com for all email addresses</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
