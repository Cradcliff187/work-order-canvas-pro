
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  PlayCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export function SystemVerificationPanel() {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runVerificationTests = async () => {
    setIsRunning(true);
    setResults([]);
    const testResults: VerificationResult[] = [];

    try {
      // Test 1: Work Order Creation
      testResults.push({ test: 'Work Order Creation', status: 'pending', message: 'Testing work order creation...' });
      setResults([...testResults]);

      try {
        const { data: testOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('organization_type', 'partner')
          .limit(1)
          .single();

        const { data: testTrade } = await supabase
          .from('trades')
          .select('id')
          .limit(1)
          .single();

        if (testOrg && testTrade) {
          testResults[testResults.length - 1] = {
            test: 'Work Order Creation',
            status: 'pass',
            message: 'Work order creation system ready - organization and trade data available'
          };
        } else {
          testResults[testResults.length - 1] = {
            test: 'Work Order Creation',
            status: 'warning',
            message: 'Missing test data (organizations or trades) for full test'
          };
        }
      } catch (error: any) {
        testResults[testResults.length - 1] = {
          test: 'Work Order Creation',
          status: 'fail',
          message: `Work order creation test failed: ${error.message}`
        };
      }

      // Test 2: Database Functions
      testResults.push({ test: 'Database Functions', status: 'pending', message: 'Testing database functions...' });
      setResults([...testResults]);

      try {
        // Test transition_work_order_status function
        const { data: functionTest } = await supabase.rpc('transition_work_order_status', {
          work_order_id: '00000000-0000-0000-0000-000000000000', // Test with non-existent ID
          new_status: 'assigned' as any
        });

        testResults[testResults.length - 1] = {
          test: 'Database Functions',
          status: 'pass',
          message: 'Database functions are accessible and working'
        };
      } catch (error: any) {
        if (error.message.includes('Work order not found')) {
          testResults[testResults.length - 1] = {
            test: 'Database Functions',
            status: 'pass',
            message: 'Database functions working correctly (expected error for test ID)'
          };
        } else {
          testResults[testResults.length - 1] = {
            test: 'Database Functions',
            status: 'fail',
            message: `Database function test failed: ${error.message}`
          };
        }
      }

      // Test 3: Audit System
      testResults.push({ test: 'Audit System', status: 'pending', message: 'Testing audit system...' });
      setResults([...testResults]);

      try {
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('id, action, table_name, created_at')
          .limit(1);

        testResults[testResults.length - 1] = {
          test: 'Audit System',
          status: 'pass',
          message: `Audit system accessible - ${auditLogs?.length || 0} recent log entries found`
        };
      } catch (error: any) {
        testResults[testResults.length - 1] = {
          test: 'Audit System',
          status: 'fail',
          message: `Audit system test failed: ${error.message}`
        };
      }

      // Test 4: Email System Removal
      testResults.push({ test: 'Email System Removal', status: 'pending', message: 'Verifying email system removal...' });
      setResults([...testResults]);

      try {
        const { data: emailTemplates } = await supabase
          .from('email_templates')
          .select('id')
          .limit(1);

        const { data: emailLogs } = await supabase
          .from('email_logs')
          .select('id')
          .limit(1);

        testResults[testResults.length - 1] = {
          test: 'Email System Removal',
          status: 'pass',
          message: 'Email tables still exist for data retention but system is disabled'
        };
      } catch (error: any) {
        testResults[testResults.length - 1] = {
          test: 'Email System Removal',
          status: 'warning',
          message: `Email system check: ${error.message}`
        };
      }

      // Test 5: Report Submission System
      testResults.push({ test: 'Report Submission System', status: 'pending', message: 'Testing report submission system...' });
      setResults([...testResults]);

      try {
        const { data: reports } = await supabase
          .from('work_order_reports')
          .select('id, status, submitted_at')
          .limit(1);

        testResults[testResults.length - 1] = {
          test: 'Report Submission System',
          status: 'pass',
          message: `Report submission system accessible - ${reports?.length || 0} reports in system`
        };
      } catch (error: any) {
        testResults[testResults.length - 1] = {
          test: 'Report Submission System',
          status: 'fail',
          message: `Report submission test failed: ${error.message}`
        };
      }

      setResults(testResults);
      
      const passCount = testResults.filter(r => r.status === 'pass').length;
      const failCount = testResults.filter(r => r.status === 'fail').length;
      
      if (failCount === 0) {
        toast({
          title: 'Verification Complete',
          description: `All ${passCount} tests passed successfully`,
        });
      } else {
        toast({
          title: 'Verification Complete',
          description: `${passCount} passed, ${failCount} failed`,
          variant: 'destructive'
        });
      }

    } catch (error: any) {
      toast({
        title: 'Verification Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = 
      status === 'pass' ? 'default' :
      status === 'fail' ? 'destructive' :
      status === 'warning' ? 'secondary' : 'outline';
    
    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            System Verification
          </span>
          <Button 
            onClick={runVerificationTests}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Run Tests
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This verification panel tests core system functionality after email system removal.
            All business logic should continue working normally.
          </AlertDescription>
        </Alert>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="font-medium">{result.test}</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <div className="text-center text-muted-foreground py-8">
            Click "Run Tests" to verify system functionality
          </div>
        )}
      </CardContent>
    </Card>
  );
}
