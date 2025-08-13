import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkOrderPipelineData } from '@/hooks/useWorkOrderPipeline';

interface PipelineActionBarProps {
  pipelineData?: WorkOrderPipelineData;
  isLoading?: boolean;
  onAssignPending?: () => void;
  onRefresh?: () => void;
}

export function PipelineActionBar({ 
  pipelineData, 
  isLoading, 
  onAssignPending = () => {},
  onRefresh = () => {}
}: PipelineActionBarProps) {
  const navigate = useNavigate();

  const actionCounts = useMemo(() => {
    if (!pipelineData) {
      return {
        unassignedCount: 0,
        pendingReportsCount: 0,
        totalOverdueCount: 0,
      };
    }

    // Calculate unassigned work orders (New stage represents unassigned orders)
    const unassignedCount = pipelineData.new.totalCount;

    // Pending reports are in the Awaiting Reports stage
    const pendingReportsCount = pipelineData.awaitingReports.totalCount;

    // Total overdue across all stages
    const totalOverdueCount = [
      pipelineData.new,
      pipelineData.assigned,
      pipelineData.inProgress,
      pipelineData.awaitingReports,
    ].reduce((total, stage) => total + stage.overdueCount, 0);

    return {
      unassignedCount,
      pendingReportsCount,
      totalOverdueCount,
    };
  }, [pipelineData]);

  const handleReviewReports = () => {
    navigate('/admin/approvals');
  };

  const handleOverdueItems = () => {
    navigate('/admin/work-orders?status=overdue');
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Skeleton className="h-9 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-border/50">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Assign Pending Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onAssignPending}
              disabled={actionCounts.unassignedCount === 0}
              className="relative hover-scale"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Assign Pending
              {actionCounts.unassignedCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 text-xs px-1.5 py-0.5 min-w-[20px] justify-center"
                >
                  {actionCounts.unassignedCount}
                </Badge>
              )}
            </Button>

            {/* Review Reports Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReviewReports}
              disabled={actionCounts.pendingReportsCount === 0}
              className="relative hover-scale"
            >
              <FileText className="h-4 w-4 mr-2" />
              Review Reports
              {actionCounts.pendingReportsCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 text-xs px-1.5 py-0.5 min-w-[20px] justify-center"
                >
                  {actionCounts.pendingReportsCount}
                </Badge>
              )}
            </Button>

            {/* Overdue Items Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOverdueItems}
              disabled={actionCounts.totalOverdueCount === 0}
              className="relative hover-scale"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Overdue Items
              {actionCounts.totalOverdueCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 text-xs px-1.5 py-0.5 min-w-[20px] justify-center"
                >
                  {actionCounts.totalOverdueCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="hover-scale ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}