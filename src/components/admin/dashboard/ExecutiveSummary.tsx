import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed';
import { 
  AlertTriangle, 
  Activity, 
  Clock, 
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ExecutiveSummary = () => {
  const navigate = useNavigate();
  const { metrics, isLoading } = useAdminDashboard();

  const handleUrgentActionsClick = () => {
    const params = new URLSearchParams();
    params.set('status', 'received');
    navigate(`/admin/work-orders?${params.toString()}`);
  };

  const handleOverdueClick = () => {
    const params = new URLSearchParams();
    params.set('overdue', 'true');
    navigate(`/admin/work-orders?${params.toString()}`);
  };

  const handlePendingApprovalsClick = () => {
    navigate('/admin/approvals');
  };

  const handlePendingInvoicesClick = () => {
    const params = new URLSearchParams();
    params.set('status', 'submitted');
    navigate(`/admin/subcontractor-bills?${params.toString()}`);
  };

  const handleTeamStatusClick = () => {
    navigate('/admin/employees');
  };

  const handleActiveUsersClick = () => {
    const params = new URLSearchParams();
    params.set('organization_type', 'subcontractor');
    params.set('is_active', 'true');
    navigate(`/admin/users?${params.toString()}`);
  };

  const handleTodayWorkOrdersClick = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const params = new URLSearchParams();
    params.set('date_from', today.toISOString().split('T')[0]);
    navigate(`/admin/work-orders?${params.toString()}`);
  };

  const handleAwaitingEstimatesClick = () => {
    const params = new URLSearchParams();
    params.set('status', 'assigned');
    params.set('missing_estimate', 'true');
    navigate(`/admin/work-orders?${params.toString()}`);
  };

  const handleNeedingMarkupClick = () => {
    const params = new URLSearchParams();
    params.set('has_subcontractor_estimate', 'true');
    params.set('missing_internal_estimate', 'true');
    navigate(`/admin/work-orders?${params.toString()}`);
  };

  const handleAwaitingApprovalClick = () => {
    const params = new URLSearchParams();
    params.set('has_internal_estimate', 'true');
    params.set('approval_pending', 'true');
    navigate(`/admin/work-orders?${params.toString()}`);
  };

  // Calculate today's activity from existing data
  const todaySubmissions = metrics?.todayWorkOrders || 0;
  const todayCompletions = metrics?.completedThisMonth || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Urgent Actions */}
      <Card className="cursor-pointer card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <div 
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={handleUrgentActionsClick}
              >
                <div className="text-lg font-bold text-destructive">
                  {metrics?.pendingAssignments || 0}
                </div>
                <div className="text-xs text-muted-foreground">Unassigned Orders</div>
              </div>
              <div 
                className="cursor-pointer hover:text-primary transition-colors pt-1"
                onClick={handleOverdueClick}
              >
                <div className="text-lg font-bold text-destructive">
                  {metrics?.overdueWorkOrders || 0}
                </div>
                <div className="text-xs text-muted-foreground">Overdue Items</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card className="cursor-pointer card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <div 
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={handleTodayWorkOrdersClick}
              >
                <div className="text-lg md:text-xl font-bold text-primary">
                  {todaySubmissions}
                </div>
                <div className="text-xs text-muted-foreground">New Work Orders Today</div>
              </div>
              <div className="cursor-pointer hover:text-primary transition-colors pt-1">
                <div className="text-lg font-bold text-success">
                  {todayCompletions}
                </div>
                <div className="text-xs text-muted-foreground">Completions</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="cursor-pointer card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <Clock className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <div 
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={handlePendingApprovalsClick}
              >
                <div className="text-lg font-bold text-warning">
                  {metrics?.pendingReports || 0}
                </div>
                <div className="text-xs text-muted-foreground">Reports to Review</div>
              </div>
              <div 
                className="cursor-pointer hover:text-primary transition-colors pt-1"
                onClick={handlePendingInvoicesClick}
              >
                <div className="text-lg font-bold text-warning">
                  {metrics?.pendingInvoices || 0}
                </div>
                <div className="text-xs text-muted-foreground">Invoices to Approve</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card className="cursor-pointer card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Status</CardTitle>
          <Users className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <div 
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={handleTeamStatusClick}
              >
                <div className="text-lg font-bold text-success">
                  {metrics?.employeesOnDuty || 0}
                </div>
                <div className="text-xs text-muted-foreground">Active Employees</div>
              </div>
              <div 
                className="cursor-pointer hover:text-primary transition-colors pt-1"
                onClick={handleActiveUsersClick}
              >
                <div className="text-lg font-bold text-success">
                  {metrics?.activeSubcontractors || 0}
                </div>
                <div className="text-xs text-muted-foreground">Active Subcontractors</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Estimate Pipeline */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estimate Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div 
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={handleAwaitingEstimatesClick}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Awaiting SC Estimates</span>
              </div>
              <Badge variant="outline">{metrics?.workOrdersNeedingEstimates || 0}</Badge>
            </div>
            
            <div 
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={handleNeedingMarkupClick}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Pending Internal Markup</span>
              </div>
              <Badge variant="outline">{metrics?.estimatesNeedingMarkup || 0}</Badge>
            </div>
            
            <div 
              className="flex items-center justify-between p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={handleAwaitingApprovalClick}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Awaiting Partner Approval</span>
              </div>
              <Badge variant="outline">{metrics?.estimatesAwaitingApproval || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed - Full Width */}
      <div className="col-span-full">
        <ActivityFeed />
      </div>
    </div>
  );
};