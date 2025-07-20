
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailHealthScoreProps {
  healthScore: number;
  alertLevel: 'critical' | 'warning' | 'healthy';
  alertMessage: string;
  totalEmails: number;
  successRate: number;
  daysSinceLastEmail: number;
  lastEmailSent: string | null;
  isLoading?: boolean;
}

export const EmailHealthScore: React.FC<EmailHealthScoreProps> = ({
  healthScore,
  alertLevel,
  alertMessage,
  totalEmails,
  successRate,
  daysSinceLastEmail,
  lastEmailSent,
  isLoading = false
}) => {
  const getHealthColor = () => {
    if (healthScore >= 80) return 'text-success';
    if (healthScore >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthIcon = () => {
    switch (alertLevel) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAlertVariant = () => {
    switch (alertLevel) {
      case 'critical':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  const formatLastEmailDate = () => {
    if (!lastEmailSent) return 'Never';
    if (daysSinceLastEmail === 0) return 'Today';
    if (daysSinceLastEmail === 1) return 'Yesterday';
    return `${daysSinceLastEmail} days ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Email System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </CardContent>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getHealthIcon()}
          Email System Health
          <Badge variant={alertLevel === 'healthy' ? 'default' : 'destructive'}>
            {healthScore}/100
          </Badge>
        </CardTitle>
        <CardDescription>
          Comprehensive health monitoring and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alertLevel !== 'healthy' && (
          <Alert variant={getAlertVariant()}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{alertMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Health Score</span>
            <span className={`text-sm font-bold ${getHealthColor()}`}>
              {healthScore}%
            </span>
          </div>
          <Progress value={healthScore} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">7-day emails:</span>
              <span className="font-medium">{totalEmails}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Success rate:</span>
              <span className={`font-medium ${successRate >= 90 ? 'text-success' : successRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                {totalEmails > 0 ? `${successRate.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last email:</span>
              <span className={`font-medium ${daysSinceLastEmail > 1 ? 'text-warning' : ''}`}>
                {formatLastEmailDate()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={alertLevel === 'healthy' ? 'default' : alertLevel === 'warning' ? 'secondary' : 'destructive'}>
                {alertLevel.charAt(0).toUpperCase() + alertLevel.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        {alertLevel === 'critical' && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              Critical Issues Detected
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the "Test Email System" button to diagnose the problem.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
