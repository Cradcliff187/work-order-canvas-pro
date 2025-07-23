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
    
    try {
      // Test 1: Create user via admin function
      console.log('🚀 Starting admin user creation test...');
      const adminResult = await supabase.functions.invoke('create-admin-user', {
        body: {
          userData: {
            email: 'chris.l.radcliff@gmail.com',
            userType: 'subcontractor',
            firstName: 'Chris Test',
            lastName: 'Admin Flow'
          },
          sendWelcomeEmail: true
        }
      });
      
      setResults(prev => [...prev, {
        test: 'Admin User Creation',
        status: adminResult.error ? 'failed' : 'success',
        data: adminResult.data,
        error: adminResult.error
      }]);

      // Test 2: Direct email function test
      console.log('📧 Testing direct email function...');
      const emailResult = await supabase.functions.invoke('send-email', {
        body: {
          template_name: 'welcome_email',
          record_id: crypto.randomUUID(),
          record_type: 'user',
          test_mode: true,
          test_recipient: 'chris.l.radcliff@gmail.com',
          custom_data: {
            user_name: 'Chris Test Direct',
            confirmation_link: 'https://test.com/confirm'
          }
        }
      });

      setResults(prev => [...prev, {
        test: 'Direct Email Test',
        status: emailResult.error ? 'failed' : 'success',
        data: emailResult.data,
        error: emailResult.error
      }]);

      // Test 3: Database trigger function
      console.log('🔧 Testing database trigger function...');
      const dbResult = await supabase.rpc('call_send_email_trigger', {
        template_name: 'welcome_email',
        record_id: crypto.randomUUID(),
        record_type: 'user'
      });

      setResults(prev => [...prev, {
        test: 'Database Trigger Function',
        status: dbResult.error ? 'failed' : 'success',
        data: dbResult.data,
        error: dbResult.error
      }]);

      toast({
        title: "Tests completed",
        description: "Check results below"
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
        <CardTitle>🧪 Email System Comprehensive Test</CardTitle>
        <CardDescription>
          Test all user creation flows and email functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveTest}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Tests...' : 'Run Full System Test'}
        </Button>

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