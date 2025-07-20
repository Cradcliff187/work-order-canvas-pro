
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Mail, TrendingUp, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { FailedEmailsModal } from './FailedEmailsModal';

interface EmailStatsCardProps {
  statistics: {
    todayTotal: number;
    todaySuccessful: number;
    successRate: number;
    averageDeliveryTime: number | null;
    mostRecentFailureReason: string | null;
    failedEmails: Array<{
      id: string;
      recipient_email: string;
      template_used: string | null;
      sent_at: string;
      error_message: string | null;
    }>;
  };
  isLoading: boolean;
  onRefresh: () => void;
  lastRefresh?: Date;
}

export const EmailStatsCard: React.FC<EmailStatsCardProps> = ({
  statistics,
  isLoading,
  onRefresh,
  lastRefresh
}) => {
  const [showFailedModal, setShowFailedModal] = useState(false);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-success';
    if (rate >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getSuccessRateBadgeVariant = (rate: number) => {
    if (rate >= 95) return 'default' as const;
    if (rate >= 80) return 'secondary' as const;
    return 'destructive' as const;
  };

  const formatDeliveryTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    return `Last updated: ${lastRefresh.toLocaleTimeString()}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Real-Time Email Statistics
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Live email delivery metrics • Auto-refreshes every 30 seconds
            {lastRefresh && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatLastRefresh()}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Today's Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{statistics.todayTotal}</div>
              <div className="text-sm text-muted-foreground">Emails Today</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{statistics.todaySuccessful}</div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getSuccessRateColor(statistics.successRate)}`}>
                {statistics.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatDeliveryTime(statistics.averageDeliveryTime)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Delivery</div>
            </div>
          </div>

          {/* Success Rate Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Delivery Success Rate</span>
              <Badge variant={getSuccessRateBadgeVariant(statistics.successRate)}>
                {statistics.successRate >= 95 ? 'Excellent' : 
                 statistics.successRate >= 80 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
            <Progress 
              value={statistics.successRate} 
              className="h-2"
            />
          </div>

          {/* Recent Failure Information */}
          {statistics.mostRecentFailureReason && (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-destructive">Most Recent Failure</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {statistics.mostRecentFailureReason}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Failed Emails Section */}
          {statistics.failedEmails.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">
                  {statistics.failedEmails.length} failed email{statistics.failedEmails.length !== 1 ? 's' : ''} today
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFailedModal(true)}
                className="flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                View Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <FailedEmailsModal
        isOpen={showFailedModal}
        onClose={() => setShowFailedModal(false)}
        failedEmails={statistics.failedEmails}
      />
    </>
  );
};
