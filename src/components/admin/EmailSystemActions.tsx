
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  RefreshCw, 
  ExternalLink, 
  Plus, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

interface EmailSystemActionsProps {
  onTestEmailSystem: () => Promise<void>;
  onCreateTestWorkOrder: () => Promise<void>;
  onRefreshHealth: () => Promise<void>;
  isTestRunning: boolean;
  lastTestResult: TestResult | null;
}

export const EmailSystemActions: React.FC<EmailSystemActionsProps> = ({
  onTestEmailSystem,
  onCreateTestWorkOrder,
  onRefreshHealth,
  isTestRunning,
  lastTestResult
}) => {
  const formatTestTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTestResultIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Test and troubleshoot email system functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={onTestEmailSystem}
            disabled={isTestRunning}
            className="flex items-center gap-2"
            variant="default"
          >
            {isTestRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Test Email System
          </Button>

          <Button 
            onClick={onCreateTestWorkOrder}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Test Work Order
          </Button>

          <Button 
            onClick={onRefreshHealth}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Health Check
          </Button>

          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.open('https://inudoymofztrvxhrlrek.supabase.co/project/inudoymofztrvxhrlrek/functions/send-email/logs', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            View System Logs
          </Button>
        </div>

        {lastTestResult && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTestResultIcon(lastTestResult)}
                <span className="text-sm font-medium">Last Test Result</span>
              </div>
              <Badge variant={lastTestResult.success ? 'default' : 'destructive'}>
                {lastTestResult.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {lastTestResult.message}
            </p>
            
            <p className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              {formatTestTime(lastTestResult.timestamp)}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Test Email System:</strong> Verifies end-to-end email delivery</p>
          <p><strong>Create Test Work Order:</strong> Generates trigger events for testing</p>
          <p><strong>Refresh Health Check:</strong> Updates all system metrics</p>
        </div>
      </CardContent>
    </Card>
  );
};
