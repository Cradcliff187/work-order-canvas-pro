import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkOrderLifecycleTesting } from '@/hooks/useWorkOrderLifecycleTesting';

export function QuickTestRunner() {
  const navigate = useNavigate();
  const { isRunning, runLifecycleTests } = useWorkOrderLifecycleTesting();

  const handleRunTests = async () => {
    await runLifecycleTests();
  };

  const handleViewFullResults = () => {
    navigate('/admin/testing');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <CardTitle>System Testing</CardTitle>
          </div>
          <Badge variant="outline">
            Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Run comprehensive tests to verify all work order functionality
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Quick Test'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleViewFullResults}
            className="flex-1"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Full Testing Suite
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}