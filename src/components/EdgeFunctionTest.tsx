import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const EdgeFunctionTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const { toast } = useToast();

  const testSeedDatabaseFunction = async () => {
    setIsLoading(true);
    const results = [];

    try {
      // Step 1: Test OPTIONS preflight request
      console.log('🔍 Testing OPTIONS preflight request...');
      const optionsUrl = 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/seed-database';
      
      try {
        const optionsResponse = await fetch(optionsUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type'
          }
        });

        const corsHeaders = {
          'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers'),
          'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods')
        };

        results.push({
          step: 'OPTIONS Preflight',
          status: optionsResponse.status,
          success: optionsResponse.ok,
          headers: corsHeaders,
          timestamp: new Date().toISOString()
        });

        console.log('OPTIONS Response:', { status: optionsResponse.status, headers: corsHeaders });
      } catch (error) {
        results.push({
          step: 'OPTIONS Preflight',
          status: 'ERROR',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        console.error('OPTIONS request failed:', error);
      }

      // Step 2: Test actual function call
      console.log('🚀 Testing seed-database function call...');
      
      const { data, error } = await supabase.functions.invoke('seed-database', {
        body: {
          admin_key: 'dev-admin-key',
          options: {
            clear_existing: false,
            include_test_data: true
          }
        }
      });

      if (error) {
        results.push({
          step: 'Function Call',
          status: 'ERROR',
          success: false,
          error: error.message,
          details: error,
          timestamp: new Date().toISOString()
        });
        console.error('Function call error:', error);
        toast({
          title: "Function Test Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        results.push({
          step: 'Function Call',
          status: 'SUCCESS',
          success: true,
          data: data,
          timestamp: new Date().toISOString()
        });
        console.log('Function call success:', data);
        toast({
          title: "Function Test Successful",
          description: "Edge Function is working properly",
          variant: "default"
        });
      }

    } catch (error) {
      results.push({
        step: 'Unexpected Error',
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      console.error('Unexpected error:', error);
      toast({
        title: "Test Failed",
        description: "Unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setTestResults(results);
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Edge Function CORS Test
          <Badge variant="outline">Development Tool</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testSeedDatabaseFunction}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Testing...' : 'Test Seed Database Function'}
          </Button>
          <Button 
            onClick={clearResults}
            variant="outline"
            disabled={testResults.length === 0}
          >
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            {testResults.map((result, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{result.step}</h4>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.status}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  {result.timestamp}
                </div>

                {result.headers && (
                  <div className="mb-2">
                    <strong>CORS Headers:</strong>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.headers, null, 2)}
                    </pre>
                  </div>
                )}

                {result.error && (
                  <div className="mb-2">
                    <strong className="text-destructive">Error:</strong>
                    <div className="text-sm text-destructive mt-1">{result.error}</div>
                  </div>
                )}

                {result.data && (
                  <div className="mb-2">
                    <strong className="text-green-600">Response Data:</strong>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}

                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      View Details
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </Card>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This tool tests:</p>
          <ul className="list-disc list-inside ml-2">
            <li>OPTIONS preflight request for CORS verification</li>
            <li>Actual Edge Function invocation</li>
            <li>Full response logging including headers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};