
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Send,
  Loader2,
  CheckCircle,
  XCircle
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

  const emailTests = [
    {
      key: 'welcome',
      title: 'Welcome Email',
      description: 'Test new user welcome email'
    },
    {
      key: 'work_order_created',
      title: 'Work Order Created',
      description: 'Test new work order notification to admins'
    },
    {
      key: 'work_order_assigned',
      title: 'Work Order Assigned',
      description: 'Test work order assignment notification'
    },
    {
      key: 'report_submitted',
      title: 'Report Submitted',
      description: 'Test report submission notification to admins'
    },
    {
      key: 'report_reviewed',
      title: 'Report Reviewed',
      description: 'Test report review notification to subcontractor'
    },
    {
      key: 'work_order_completed',
      title: 'Work Order Completed',
      description: 'Test completion notification to partners'
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
          Test all email functions with IONOS SMTP configuration
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailTests.map((test) => {
            const result = testResults[test.key];
            
            return (
              <Card key={test.key} className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{test.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {test.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      onClick={() => runEmailTest(test.key)}
                      disabled={isLoading || !testEmail}
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
            All emails will be sent through IONOS SMTP from <strong>AKC-WorkOrderPortal &lt;support@workorderportal.com&gt;</strong>.
            Check your email logs in the admin dashboard for delivery status.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
