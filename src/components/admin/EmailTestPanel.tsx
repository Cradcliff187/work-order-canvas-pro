
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

interface TestData {
  workOrderId?: string;
  reportId?: string;
  userId?: string;
}

export const EmailTestPanel = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [testEmail, setTestEmail] = useState('chris.l.radcliff@gmail.com');
  const [isWorkflowTesting, setIsWorkflowTesting] = useState(false);
  const [testData, setTestData] = useState<TestData>({});

  // Fetch real test data from the database
  const fetchTestData = async (): Promise<TestData> => {
    try {
      // Get a real work order ID
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('id')
        .limit(1)
        .single();

      // Get a real work order report ID
      const { data: reports } = await supabase
        .from('work_order_reports')
        .select('id')
        .limit(1)
        .single();

      // Get a real user profile ID for testing
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', testEmail)
        .limit(1)
        .single();

      const data: TestData = {
        workOrderId: workOrders?.id || 'b0f84a38-b56b-487b-8a6e-416fba0e9a53', // Fallback to known ID
        reportId: reports?.id || 'cc03669c-ec52-4eb6-8ab5-0a276807bfb1', // Fallback to known ID
        userId: profiles?.id || undefined
      };

      setTestData(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch test data:', error);
      // Use fallback IDs from your database
      const fallbackData: TestData = {
        workOrderId: 'b0f84a38-b56b-487b-8a6e-416fba0e9a53',
        reportId: 'cc03669c-ec52-4eb6-8ab5-0a276807bfb1'
      };
      setTestData(fallbackData);
      return fallbackData;
    }
  };

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
      // Fetch real test data first
      const data = await fetchTestData();
      let result: TestResult;

      switch (testType) {
        case 'welcome':
          if (data.userId) {
            result = await testEmailFunction('email-welcome-user', {
              userId: data.userId,
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
            workOrderId: data.workOrderId
          });
          break;

        case 'work_order_assigned':
          result = await testEmailFunction('email-work-order-assigned', {
            workOrderId: data.workOrderId,
            assignedUserId: data.userId || 'test-user-id'
          });
          break;

        case 'report_submitted':
          result = await testEmailFunction('email-report-submitted', {
            reportId: data.reportId
          });
          break;

        case 'report_reviewed':
          result = await testEmailFunction('email-report-reviewed', {
            reportId: data.reportId,
            status: 'approved',
            reviewNotes: 'Great work! Report approved.'
          });
          break;

        case 'work_order_completed':
          result = await testEmailFunction('email-work-order-completed', {
            workOrderId: data.workOrderId
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
      status: 'Phase 1 - IONOS SMTP'
    },
    {
      key: 'work_order_assigned',
      title: 'Work Order Assigned',
      description: 'Test work order assignment notification',
      status: 'Phase 2 Next'
    },
    {
      key: 'report_submitted',
      title: 'Report Submitted',
      description: 'Test report submission notification to admins',
      status: 'Phase 2 Next'
    },
    {
      key: 'report_reviewed',
      title: 'Report Reviewed',
      description: 'Test report review notification to subcontractor',
      status: 'Phase 2 Next'
    },
    {
      key: 'work_order_completed',
      title: 'Work Order Completed',
      description: 'Test completion notification to partners',
      status: 'Phase 2 Next'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email System Testing - IONOS SMTP Implementation
        </CardTitle>
        <CardDescription>
          Phase 1: Testing email-work-order-created with IONOS SMTP. Real database IDs: Work Order {testData.workOrderId || 'loading...'}, Report {testData.reportId || 'loading...'}
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
                    <Badge 
                      variant={test.key === 'work_order_created' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
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
            <strong>Phase 1 Status:</strong> 
            <br />✅ IONOS SMTP configured for email-work-order-created
            <br />✅ Real database IDs loaded for testing
            <br />✅ Using denomailer@1.6.0 for Deno SMTP
            <br />⏳ Testing with support@workorderportal.com sender
            <br />All emails send through IONOS SMTP from <strong>AKC-WorkOrderPortal &lt;support@workorderportal.com&gt;</strong>.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
