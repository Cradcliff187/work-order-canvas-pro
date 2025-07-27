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
  Users 
} from 'lucide-react';

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
    navigate(`/admin/invoices?${params.toString()}`);
  };

  const handleTeamStatusClick = () => {
    navigate('/admin/employees');
  };

  const handleActiveUsersClick = () => {
    const params = new URLSearchParams();
    params.set('user_type', 'subcontractor');
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

      {/* Activity Feed - Full Width */}
      <div className="col-span-full">
        <ActivityFeed />
      </div>
    </div>
  );
};