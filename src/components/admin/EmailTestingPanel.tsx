
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Mail, CheckCircle, XCircle, Clock, Send, Database, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailTest {
  id: string;
  name: string;
  description: string;
  template_name: string;
  record_type: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  result?: string;
  error?: string;
}

export function EmailTestingPanel() {
  const [tests, setTests] = useState<EmailTest[]>([
    {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'Test the welcome email sent when a new user is created',
      template_name: 'welcome_email',
      record_type: 'profile',
      status: 'idle'
    },
    {
      id: 'work_order_created',
      name: 'Work Order Created',
      description: 'Test email sent when a new work order is created',
      template_name: 'work_order_created',
      record_type: 'work_order',
      status: 'idle'
    },
    {
      id: 'work_order_assigned',
      name: 'Work Order Assigned',
      description: 'Test email sent when a work order is assigned',
      template_name: 'work_order_assigned',
      record_type: 'work_order',
      status: 'idle'
    },
    {
      id: 'report_submitted',
      name: 'Report Submitted',
      description: 'Test email sent when a work order report is submitted',
      template_name: 'report_submitted',
      record_type: 'work_order_report',
      status: 'idle'
    },
    {
      id: 'report_reviewed',
      name: 'Report Reviewed',
      description: 'Test email sent when a report is approved/rejected',
      template_name: 'report_reviewed',
      record_type: 'work_order_report',
      status: 'idle'
    }
  ]);
  
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const { toast } = useToast();

  const updateTestStatus = (testId: string, status: EmailTest['status'], result?: string, error?: string) => {
    setTests(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status, result, error }
        : test
    ));
  };

  const testEmailTrigger = async (test: EmailTest) => {
    updateTestStatus(test.id, 'testing');
    
    try {
      // Call the send-email edge function directly for testing
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: test.template_name,
          record_id: `TEST-${test.id.toUpperCase()}-001`,
          record_type: test.record_type,
          test_mode: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      updateTestStatus(test.id, 'success', `Email sent successfully - ID: ${result.message_id || 'N/A'}`);
      
      toast({
        title: "Email Test Successful",
        description: `${test.name} email sent successfully`,
      });

      // Refresh email logs
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
        .limit(10);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    }
  };

  const runAllTests = async () => {
    for (const test of tests) {
      await testEmailTrigger(test);
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
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

  React.useEffect(() => {
    fetchEmailLogs();
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
            This will send test emails using the Resend service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Email Trigger Tests</h3>
            <Button onClick={runAllTests} disabled={tests.some(t => t.status === 'testing')}>
              <Send className="h-4 w-4 mr-2" />
              Run All Tests
            </Button>
          </div>
          
          <div className="space-y-3">
            {tests.map((test) => (
              <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
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
              {emailLogs.length > 0 ? (
                emailLogs.map((log, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{log.template_used}</div>
                        <div className="text-muted-foreground">To: {log.recipient_email}</div>
                        {log.resend_message_id && (
                          <div className="text-xs text-muted-foreground">
                            Message ID: {log.resend_message_id}
                          </div>
                        )}
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
                  No email logs found
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
              <p>• <strong>Welcome Emails:</strong> Sent via Resend with custom branding</p>
              <p>• <strong>Work Order Emails:</strong> Sent via Resend with custom branding</p>
              <p>• <strong>Report Emails:</strong> Sent via Resend with custom branding</p>
              <p>• <strong>Auth Emails:</strong> Sent via Supabase SMTP (password reset, etc.)</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
