
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TestTube, 
  Send, 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Play,
  Eye,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
  timestamp?: string;
}

export const ComprehensiveEmailTester: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateTestResult = (testName: string, result: Partial<TestResult>) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.name === testName);
      if (existing) {
        return prev.map(t => 
          t.name === testName 
            ? { ...t, ...result, timestamp: new Date().toISOString() }
            : t
        );
      } else {
        return [...prev, { 
          name: testName, 
          status: 'pending', 
          ...result, 
          timestamp: new Date().toISOString() 
        }];
      }
    });
  };

  const runTemplateIntegrationTests = async () => {
    const templates = [
      { name: 'welcome_email', recordType: 'profile' },
      { name: 'work_order_created', recordType: 'work_order' },
      { name: 'work_order_assigned', recordType: 'work_order_assignment' },
      { name: 'report_submitted', recordType: 'work_order_report' },
      { name: 'report_reviewed', recordType: 'work_order_report' },
      { name: 'work_order_completed', recordType: 'work_order' }
    ];

    for (const template of templates) {
      const testName = `Template: ${template.name}`;
      updateTestResult(testName, { status: 'running' });
      
      try {
        const testId = crypto.randomUUID();
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            template_name: template.name,
            record_id: testId,
            record_type: template.recordType,
            recipient_email: 'test@workorderpro.com',
            test_mode: true
          }
        });

        if (error) throw error;

        updateTestResult(testName, {
          status: 'success',
          message: `Template rendered successfully`,
          details: data
        });
      } catch (error: any) {
        updateTestResult(testName, {
          status: 'error',
          message: `Template test failed: ${error.message}`,
          details: error
        });
      }
    }
  };

  const runDatabaseTriggerTests = async () => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!adminProfile) {
        throw new Error('Admin profile not found');
      }

      // Test 1: Profile Creation Trigger
      updateTestResult('DB Trigger: Profile Creation', { status: 'running' });
      try {
        const testProfileId = crypto.randomUUID();
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: testProfileId,
            user_id: testProfileId,
            email: `triggertest-${Date.now()}@workorderpro.test`,
            first_name: 'Trigger',
            last_name: 'Test',
            user_type: 'subcontractor'
          });

        if (profileError) throw profileError;

        // Wait for trigger to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if email was logged
        const { data: emailLogs } = await supabase
          .from('email_logs')
          .select('*')
          .eq('template_used', 'welcome_email')
          .gte('sent_at', new Date(Date.now() - 10000).toISOString())
          .order('sent_at', { ascending: false })
          .limit(1);

        updateTestResult('DB Trigger: Profile Creation', {
          status: emailLogs && emailLogs.length > 0 ? 'success' : 'error',
          message: emailLogs && emailLogs.length > 0 
            ? 'Profile creation trigger fired successfully' 
            : 'No email log found - trigger may not have fired',
          details: emailLogs
        });
      } catch (error: any) {
        updateTestResult('DB Trigger: Profile Creation', {
          status: 'error',
          message: `Profile trigger test failed: ${error.message}`
        });
      }

      // Test 2: Work Order Creation Trigger
      updateTestResult('DB Trigger: Work Order Creation', { status: 'running' });
      try {
        // Get test data
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .limit(1)
          .maybeSingle();

        const { data: trade } = await supabase
          .from('trades')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (!org || !trade) {
          throw new Error('Missing test organizations or trades');
        }

        const testWONumber = `TEST-${Date.now()}`;
        const { error: woError } = await supabase
          .from('work_orders')
          .insert({
            title: 'Email Trigger Test Work Order',
            description: 'This work order tests the email trigger system',
            work_order_number: testWONumber,
            organization_id: org.id,
            trade_id: trade.id,
            created_by: adminProfile.id,
            store_location: 'Test Location',
            street_address: '123 Test Street',
            city: 'Test City',
            state: 'TX',
            zip_code: '12345',
            status: 'received'
          });

        if (woError) throw woError;

        // Wait for trigger to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if email was logged
        const { data: emailLogs } = await supabase
          .from('email_logs')
          .select('*')
          .eq('template_used', 'work_order_created')
          .gte('sent_at', new Date(Date.now() - 10000).toISOString())
          .order('sent_at', { ascending: false })
          .limit(1);

        updateTestResult('DB Trigger: Work Order Creation', {
          status: emailLogs && emailLogs.length > 0 ? 'success' : 'error',
          message: emailLogs && emailLogs.length > 0 
            ? 'Work order creation trigger fired successfully' 
            : 'No email log found - trigger may not have fired',
          details: emailLogs
        });
      } catch (error: any) {
        updateTestResult('DB Trigger: Work Order Creation', {
          status: 'error',
          message: `Work order trigger test failed: ${error.message}`
        });
      }

      // Test 3: Assignment Creation Trigger
      updateTestResult('DB Trigger: Assignment Creation', { status: 'running' });
      try {
        // Get a test work order
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('id')
          .limit(1)
          .maybeSingle();

        // Get a test assignee profile
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('id')
          .neq('id', adminProfile.id)
          .limit(1)
          .maybeSingle();

        if (!workOrder || !assigneeProfile) {
          throw new Error('Missing test work order or assignee profile');
        }

        const { error: assignmentError } = await supabase
          .from('work_order_assignments')
          .insert({
            work_order_id: workOrder.id,
            assigned_to: assigneeProfile.id,
            assigned_by: adminProfile.id,
            assignment_type: 'lead',
            notes: 'Email trigger test assignment'
          });

        if (assignmentError) throw assignmentError;

        // Wait for trigger to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if email was logged
        const { data: emailLogs } = await supabase
          .from('email_logs')
          .select('*')
          .eq('template_used', 'work_order_assigned')
          .gte('sent_at', new Date(Date.now() - 10000).toISOString())
          .order('sent_at', { ascending: false })
          .limit(1);

        updateTestResult('DB Trigger: Assignment Creation', {
          status: emailLogs && emailLogs.length > 0 ? 'success' : 'error',
          message: emailLogs && emailLogs.length > 0 
            ? 'Assignment creation trigger fired successfully' 
            : 'No email log found - trigger may not have fired',
          details: emailLogs
        });
      } catch (error: any) {
        updateTestResult('DB Trigger: Assignment Creation', {
          status: 'error',
          message: `Assignment trigger test failed: ${error.message}`
        });
      }

    } catch (error: any) {
      updateTestResult('DB Trigger Tests', {
        status: 'error',
        message: `Database trigger tests failed: ${error.message}`
      });
    }
  };

  const runEmailLogVerification = async () => {
    updateTestResult('Email Log Verification', { status: 'running' });
    
    try {
      // Get recent email logs
      const { data: emailLogs, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Analyze email logs
      const totalEmails = emailLogs?.length || 0;
      const successfulEmails = emailLogs?.filter(log => log.status === 'sent').length || 0;
      const failedEmails = emailLogs?.filter(log => log.status === 'failed').length || 0;
      const recentEmails = emailLogs?.filter(log => 
        new Date(log.sent_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length || 0;

      const templateUsage = emailLogs?.reduce((acc, log) => {
        if (log.template_used) {
          acc[log.template_used] = (acc[log.template_used] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      updateTestResult('Email Log Verification', {
        status: 'success',
        message: `Found ${totalEmails} email logs (${successfulEmails} sent, ${failedEmails} failed, ${recentEmails} in last 24h)`,
        details: {
          totalEmails,
          successfulEmails,
          failedEmails,
          recentEmails,
          templateUsage
        }
      });
    } catch (error: any) {
      updateTestResult('Email Log Verification', {
        status: 'error',
        message: `Email log verification failed: ${error.message}`
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      updateTestResult('Starting Tests', { status: 'running', message: 'Initializing comprehensive email system test...' });
      
      // Run template integration tests
      await runTemplateIntegrationTests();
      
      // Run database trigger tests
      await runDatabaseTriggerTests();
      
      // Run email log verification
      await runEmailLogVerification();
      
      updateTestResult('All Tests Complete', { 
        status: 'success', 
        message: 'Comprehensive email system test completed successfully' 
      });
      
      toast({
        title: "Testing Complete",
        description: "All email system tests have been completed. Check results below.",
      });
    } catch (error: any) {
      updateTestResult('Test Suite Error', {
        status: 'error',
        message: `Testing failed: ${error.message}`
      });
      
      toast({
        title: "Testing Failed",
        description: `Testing suite encountered an error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const successCount = testResults.filter(t => t.status === 'success').length;
  const errorCount = testResults.filter(t => t.status === 'error').length;
  const runningCount = testResults.filter(t => t.status === 'running').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Email System Test
          </CardTitle>
          <CardDescription>
            Comprehensive verification of database triggers, template integration, and email logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Test Status</div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {successCount} Passed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  {errorCount} Failed
                </span>
                <span className="flex items-center gap-1">
                  <Loader2 className="h-4 w-4 text-blue-600" />
                  {runningCount} Running
                </span>
              </div>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Test Results</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <span className="font-medium">{test.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(test.status)}>
                        {test.status}
                      </Badge>
                      {test.details && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            console.log('Test Details:', test);
                            toast({
                              title: test.name,
                              description: test.message || 'Check console for details'
                            });
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResults.some(test => test.message) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Click the eye icon next to any test to view detailed results and logs. 
                All test details are also logged to the browser console.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
