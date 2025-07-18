
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Workflow
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const EmailTestPanel = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [testEmail, setTestEmail] = useState('chris.l.radcliff@gmail.com');
  const [isWorkflowTesting, setIsWorkflowTesting] = useState(false);

  const testEmailFunction = async (functionName: string, payload: any) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) throw error;

      return {
        success: true,
        message: data?.message || 'Email sent successfully',
        details: data
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send email',
        details: error
      };
    }
  };

  const runEmailTest = async (testType: string) => {
    setIsLoading(true);
    
    try {
      let result: TestResult;

      switch (testType) {
        case 'welcome':
          // Create a test user entry for welcome email
          const { data: testUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', testEmail)
            .single();

          if (testUser) {
            result = await testEmailFunction('email-welcome-user', {
              userId: testUser.id,
              temporaryPassword: 'Test123!'
            });
          } else {
            result = {
              success: false,
              message: 'Test user not found. Please create a user with this email first.'
            };
          }
          break;

        case 'work_order_created':
          result = await testEmailFunction('email-work-order-created', {
            workOrderId: 'test-wo-id'
          });
          break;

        case 'work_order_assigned':
          result = await testEmailFunction('email-work-order-assigned', {
            workOrderId: 'test-wo-id',
            assignedUserId: 'test-user-id'
          });
          break;

        case 'report_submitted':
          result = await testEmailFunction('email-report-submitted', {
            reportId: 'test-report-id'
          });
          break;

        case 'report_reviewed':
          result = await testEmailFunction('email-report-reviewed', {
            reportId: 'test-report-id',
            status: 'approved',
            reviewNotes: 'Great work! Report approved.'
          });
          break;

        case 'work_order_completed':
          result = await testEmailFunction('email-work-order-completed', {
            workOrderId: 'test-wo-id'
          });
          break;

        default:
          result = {
            success: false,
            message: 'Unknown test type'
          };
      }

      setTestResults(prev => ({
        ...prev,
        [testType]: result
      }));

      toast({
        title: result.success ? 'Test Successful' : 'Test Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });

    } catch (error: any) {
      const failedResult = {
        success: false,
        message: error.message || 'Unexpected error'
      };

      setTestResults(prev => ({
        ...prev,
        [testType]: failedResult
      }));

      toast({
        title: 'Test Failed',
        description: failedResult.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runWorkflowTest = async () => {
    setIsWorkflowTesting(true);
    toast({
      title: 'Workflow Test Started',
      description: 'Testing complete work order email lifecycle...'
    });

    const tests = [
      'work_order_created',
      'work_order_assigned', 
      'report_submitted',
      'report_reviewed',
      'work_order_completed'
    ];

    for (const test of tests) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between tests
      await runEmailTest(test);
    }

    setIsWorkflowTesting(false);
    toast({
      title: 'Workflow Test Complete',
      description: 'All workflow emails have been tested'
    });
  };

  const emailTests = [
    {
      key: 'welcome',
      title: 'Welcome Email',
      description: 'Test new user welcome email',
      status: 'Phase 2 Complete'
    },
    {
      key: 'work_order_created',
      title: 'Work Order Created',
      description: 'Test new work order notification to admins',
      status: 'Phase 2 Complete'
    },
    {
      key: 'work_order_assigned',
      title: 'Work Order Assigned',
      description: 'Test work order assignment notification',
      status: 'Phase 2 Complete'
    },
    {
      key: 'report_submitted',
      title: 'Report Submitted',
      description: 'Test report submission notification to admins',
      status: 'Phase 2 Complete'
    },
    {
      key: 'report_reviewed',
      title: 'Report Reviewed',
      description: 'Test report review notification to subcontractor',
      status: 'Phase 2 Complete'
    },
    {
      key: 'work_order_completed',
      title: 'Work Order Completed',
      description: 'Test completion notification to partners',
      status: 'Phase 2 Complete'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email System Testing
        </CardTitle>
        <CardDescription>
          Test all email functions with IONOS SMTP configuration. Phase 2 & 3 Complete - All Edge Functions Created & Integrated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={runWorkflowTest}
              disabled={isWorkflowTesting || !testEmail}
              className="flex items-center gap-2"
              variant="outline"
            >
              {isWorkflowTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Workflow className="h-4 w-4" />
              )}
              Test Complete Workflow
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailTests.map((test) => {
            const result = testResults[test.key];
            
            return (
              <Card key={test.key} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{test.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {test.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {test.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      onClick={() => runEmailTest(test.key)}
                      disabled={isLoading || !testEmail || isWorkflowTesting}
                      className="flex items-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Test
                    </Button>
                    
                    {result && (
                      <div className="flex items-center gap-1">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {result && (
                    <Alert className={`mt-2 ${result.success ? 'border-success' : 'border-destructive'}`}>
                      <AlertDescription className="text-xs">
                        {result.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <strong>Phase Status:</strong> 
            <br />✅ Phase 2 Complete: All 6 edge functions created and deployed
            <br />✅ Phase 3 Complete: Email templates integrated with variable replacement
            <br />⏳ Phase 4 In Progress: Workflow automation triggers added
            <br />All emails send through IONOS SMTP from <strong>AKC-WorkOrderPortal &lt;support@workorderportal.com&gt;</strong>.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
