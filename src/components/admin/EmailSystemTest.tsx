import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function EmailSystemTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const runComprehensiveTest = async () => {
    setTesting(true);
    setResults([]);
    const testEmail = 'chris.l.radcliff@gmail.com';
    
    try {
      // Test 1: Production User Creation Flow
      console.log('🚀 Starting production user creation test...');
      const userCreationResult = await supabase.functions.invoke('create-test-auth-users');
      
      setResults(prev => [...prev, {
        test: 'Production User Creation (Auth + Profiles)',
        status: userCreationResult.error ? 'failed' : 'success',
        data: userCreationResult.data,
        error: userCreationResult.error
      }]);

      // Test 2: Work Order Lifecycle (Create → Assign → Complete)
      console.log('📋 Testing complete work order lifecycle...');
      
      // Get test organization and trade
      const { data: org } = await supabase.from('organizations').select('id').eq('organization_type', 'partner').limit(1).single();
      const { data: trade } = await supabase.from('trades').select('id').limit(1).single();
      const { data: admin } = await supabase.from('profiles').select('id').eq('user_type', 'admin').limit(1).single();

      if (org && trade && admin) {
        // Create work order (triggers work_order_created email)
        const { data: newWO, error: woError } = await supabase.from('work_orders').insert({
          work_order_number: `TEST-WO-${Date.now()}`,
          title: 'End-to-End Email Test Work Order',
          description: 'Testing production email triggers',
          organization_id: org.id,
          trade_id: trade.id,
          status: 'received',
          created_by: admin.id,
          date_submitted: new Date().toISOString(),
          store_location: 'Test Location',
          street_address: '123 Test Street',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345'
        }).select().single();

        setResults(prev => [...prev, {
          test: 'Work Order Creation (triggers work_order_created email)',
          status: woError ? 'failed' : 'success',
          data: newWO,
          error: woError
        }]);

        if (newWO) {
          // Create assignment (triggers work_order_assigned email)
          const { data: assignment, error: assignError } = await supabase.from('work_order_assignments').insert({
            work_order_id: newWO.id,
            assigned_to: admin.id,
            assigned_by: admin.id,
            assignment_type: 'lead',
            notes: 'Production path email test assignment'
          }).select().single();

          setResults(prev => [...prev, {
            test: 'Work Order Assignment (triggers work_order_assigned email)',
            status: assignError ? 'failed' : 'success',
            data: assignment,
            error: assignError
          }]);

          // Submit report (triggers report_submitted email)
          const { data: report, error: reportError } = await supabase.from('work_order_reports').insert({
            work_order_id: newWO.id,
            subcontractor_user_id: admin.id,
            work_performed: 'Production test work completed',
            materials_used: 'Test materials',
            hours_worked: 3.5,
            status: 'submitted'
          }).select().single();

          setResults(prev => [...prev, {
            test: 'Report Submission (triggers report_submitted email)',
            status: reportError ? 'failed' : 'success',
            data: report,
            error: reportError
          }]);

          // Update work order to completed (triggers work_order_completed email)
          const { data: completedWO, error: completeError } = await supabase
            .from('work_orders')
            .update({ status: 'completed' })
            .eq('id', newWO.id)
            .select().single();

          setResults(prev => [...prev, {
            test: 'Work Order Completion (triggers work_order_completed email)',
            status: completeError ? 'failed' : 'success',
            data: completedWO,
            error: completeError
          }]);
        }
      }

      // Test 3: All Email Templates Bulk Test
      console.log('📧 Testing all email templates...');
      const bulkResult = await supabase.functions.invoke('test-all-emails', {
        body: { recipient_email: testEmail }
      });

      setResults(prev => [...prev, {
        test: 'Bulk All Templates Test (9 emails to chris.l.radcliff@gmail.com)',
        status: bulkResult.error ? 'failed' : 'success',
        data: bulkResult.data,
        error: bulkResult.error
      }]);

      // Test 4: Password Reset Flow
      console.log('🔑 Testing password reset email...');
      const resetResult = await supabase.functions.invoke('password-reset-email', {
        body: { email: testEmail }
      });

      setResults(prev => [...prev, {
        test: 'Password Reset Email (production path)',
        status: resetResult.error ? 'failed' : 'success',
        data: resetResult.data,
        error: resetResult.error
      }]);

      // Test 5: Database Trigger Test Environment
      console.log('🔧 Testing database trigger with real context...');
      const dbResult = await supabase.rpc('call_send_email_trigger', {
        template_name: 'test_email',
        record_id: crypto.randomUUID(),
        record_type: 'comprehensive_test',
        context_data: { 
          test_recipient: testEmail,
          test_type: 'comprehensive_system_test',
          timestamp: new Date().toISOString()
        }
      });

      setResults(prev => [...prev, {
        test: 'Database Trigger Function (with context)',
        status: dbResult.error ? 'failed' : 'success',
        data: dbResult.data,
        error: dbResult.error
      }]);

      toast({
        title: "Comprehensive Tests Completed",
        description: `All production email paths tested with ${testEmail}`
      });

    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test failed",
        description: String(error),
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🧪 Real-World Email System Test</CardTitle>
        <CardDescription>
          Test all production email paths using real database triggers and workflows. All emails sent to chris.l.radcliff@gmail.com.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveTest}
          disabled={testing}
          className="w-full h-12 text-lg"
        >
          {testing ? 'Running Production Email Tests...' : 'Run Complete Production Email Test Suite'}
        </Button>
        
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <p><strong>This test suite covers:</strong></p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Production user creation with auth integration</li>
            <li>Complete work order lifecycle (create → assign → report → complete)</li>
            <li>All 9 email templates via bulk test function</li>
            <li>Password reset production flow</li>
            <li>Database trigger functions with real context</li>
          </ul>
          <p className="mt-2"><strong>All emails delivered to:</strong> chris.l.radcliff@gmail.com</p>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{result.test}</CardTitle>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {result.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                      <strong>Error:</strong> {JSON.stringify(result.error, null, 2)}
                    </div>
                  )}
                  {result.data && (
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      <strong>Result:</strong> {JSON.stringify(result.data, null, 2)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}