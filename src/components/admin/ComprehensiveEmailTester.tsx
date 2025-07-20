
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TestTube, 
  Send, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  template: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: string;
  recipient?: string;
  details?: any;
}

export const ComprehensiveEmailTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();

  const emailTests = [
    {
      template: 'work_order_created',
      name: 'Work Order Created',
      description: 'Sent to admins when a new work order is submitted',
      recordType: 'work_order'
    },
    {
      template: 'work_order_assigned',
      name: 'Work Order Assigned',
      description: 'Sent to subcontractors when work is assigned',
      recordType: 'work_order_assignment'
    },
    {
      template: 'report_submitted',
      name: 'Report Submitted',
      description: 'Sent to admins when subcontractor submits work report',
      recordType: 'work_order_report'
    },
    {
      template: 'report_reviewed',
      name: 'Report Reviewed',
      description: 'Sent to subcontractors when report is approved/rejected',
      recordType: 'work_order_report'
    },
    {
      template: 'work_order_completed',
      name: 'Work Order Completed',
      description: 'Sent to partners when work is completed',
      recordType: 'work_order'
    },
    {
      template: 'welcome_email',
      name: 'Welcome Email',
      description: 'Sent to new users when account is created',
      recordType: 'profile'
    }
  ];

  const updateTestResult = (template: string, result: Partial<TestResult>) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.template === template);
      if (existing) {
        return prev.map(r => r.template === template 
          ? { ...r, ...result, timestamp: new Date().toISOString() }
          : r
        );
      } else {
        return [...prev, { 
          template, 
          status: 'pending', 
          message: '', 
          timestamp: new Date().toISOString(),
          ...result 
        }];
      }
    });
  };

  const getTestRecordId = async (recordType: string): Promise<string> => {
    switch (recordType) {
      case 'work_order': {
        const { data } = await supabase
          .from('work_orders')
          .select('id')
          .limit(1)
          .single();
        return data?.id || crypto.randomUUID();
      }
      case 'work_order_assignment': {
        const { data } = await supabase
          .from('work_order_assignments')
          .select('id')
          .limit(1)
          .single();
        return data?.id || crypto.randomUUID();
      }
      case 'work_order_report': {
        const { data } = await supabase
          .from('work_order_reports')
          .select('id')
          .limit(1)
          .single();
        return data?.id || crypto.randomUUID();
      }
      case 'profile': {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .single();
        return data?.id || crypto.randomUUID();
      }
      default:
        return crypto.randomUUID();
    }
  };

  const testSingleEmail = async (emailTest: typeof emailTests[0], useTestMode: boolean = true) => {
    const { template, recordType } = emailTest;
    
    updateTestResult(template, { status: 'pending', message: 'Starting test...' });

    try {
      const recordId = await getTestRecordId(recordType);
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_name: template,
          record_id: recordId,
          record_type: recordType,
          recipient_email: testEmail || undefined,
          test_mode: useTestMode
        }
      });

      if (error) throw error;

      updateTestResult(template, {
        status: 'success',
        message: useTestMode ? 'Preview generated successfully' : 'Email sent successfully',
        recipient: data?.recipient || testEmail || 'Default recipient',
        details: data
      });

    } catch (error: any) {
      updateTestResult(template, {
        status: 'error',
        message: error.message || 'Test failed',
        details: error
      });
    }
  };

  const testAllEmails = async (useTestMode: boolean = true) => {
    setIsRunning(true);
    setTestResults([]);

    try {
      for (const emailTest of emailTests) {
        await testSingleEmail(emailTest, useTestMode);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast({
        title: "Email Testing Complete",
        description: `All ${emailTests.length} email templates tested`,
      });
    } catch (error: any) {
      toast({
        title: "Testing Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const sendAllRealEmails = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address to receive all emails",
        variant: "destructive"
      });
      return;
    }

    const confirmed = confirm(
      `This will send ${emailTests.length} real emails to ${testEmail}. Are you sure?`
    );

    if (confirmed) {
      await testAllEmails(false);
    }
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default: return <TestTube className="h-4 w-4 text-gray-400" />;
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Comprehensive Email System Tester
          </CardTitle>
          <CardDescription>
            Test all email templates with real data and verify IONOS SMTP delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testEmail">Test Email Address (optional)</Label>
            <Input
              id="testEmail"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave empty to use default recipients for each email type
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => testAllEmails(true)} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              Test All (Preview Mode)
            </Button>
            
            <Button 
              onClick={sendAllRealEmails} 
              disabled={isRunning}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send All Real Emails
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Success: {successCount}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" />
                Errors: {errorCount}
              </span>
              <span className="text-muted-foreground">
                Total: {testResults.length}/{emailTests.length}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No tests run yet. Click "Test All" to begin testing email templates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {testResults.map((result) => {
                const emailTest = emailTests.find(t => t.template === result.template);
                return (
                  <Card key={result.template}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getResultIcon(result.status)}
                          <div>
                            <div className="font-medium">{emailTest?.name || result.template}</div>
                            <div className="text-sm text-muted-foreground">
                              {emailTest?.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                          {result.recipient && (
                            <div className="text-sm text-muted-foreground mt-1">
                              To: {result.recipient}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {result.message && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {result.message}
                        </div>
                      )}
                      
                      {result.status === 'error' && result.details && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {JSON.stringify(result.details, null, 2)}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {emailTests.map((emailTest) => (
              <Card key={emailTest.template}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{emailTest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Template: {emailTest.template}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {emailTest.description}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testSingleEmail(emailTest, true)}
                        disabled={isRunning}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => testSingleEmail(emailTest, false)}
                        disabled={isRunning}
                      >
                        Send Real
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
