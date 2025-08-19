import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useWorkOrderLifecycleTesting } from '@/hooks/useWorkOrderLifecycleTesting';

export function LifecycleTestRunner() {
  const { results, isRunning, runLifecycleTests } = useWorkOrderLifecycleTesting();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pass':
        return 'default' as const;
      case 'fail':
        return 'destructive' as const;
      case 'running':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Work Order Lifecycle Testing
          <Button 
            onClick={runLifecycleTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results.length === 0 && !isRunning && (
          <p className="text-muted-foreground text-center py-8">
            Click "Run Tests" to verify all work order functionality
          </p>
        )}
        
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-4 rounded-lg border">
              {getStatusIcon(result.status)}
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{result.testName}</h4>
                  <Badge variant={getStatusVariant(result.status)}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                
                {result.details && (
                  <p className="text-sm text-muted-foreground">{result.details}</p>
                )}
                
                {result.error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {result.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}