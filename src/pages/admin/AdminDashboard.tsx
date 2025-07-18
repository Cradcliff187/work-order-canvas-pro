import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Users, 
  Building, 
  TrendingUp, 
  AlertCircle,
  CheckSquare,
  Clock,
  FileText,
  DollarSign,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { DashboardChart } from '@/components/admin/DashboardChart';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { SystemVerificationPanel } from '@/components/admin/SystemVerificationPanel';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { 
    metrics, 
    statusDistribution, 
    dailySubmissions, 
    tradeVolumes, 
    recentWorkOrders, 
    recentReports, 
    isLoading, 
    isError 
  } = useAdminDashboard();

  if (isError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Dashboard Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Unable to load dashboard data. Please check your connection and try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/work-orders')}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Manage Work Orders
          </Button>
        </div>
      </div>

      {/* System Verification Panel */}
      <SystemVerificationPanel />

      {/* Email Test Panel */}
      <EmailTestPanel />

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.totalWorkOrders.current || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics && getTrendIcon(metrics.totalWorkOrders.trend)}
              <span className="ml-1">
                {metrics?.totalWorkOrders.lastMonth || 0} last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.pendingAssignments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Work Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.overdueWorkOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.completedThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.pendingInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.unpaidApprovedInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees On Duty</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.employeesOnDuty || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active in last 3 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Work Order Submissions</CardTitle>
            <CardDescription>
              Daily work order submissions over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardChart 
              data={dailySubmissions || []} 
              type="line"
              dataKey="count"
              xAxisKey="date"
            />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>
              Current work order status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart 
              data={statusDistribution || []} 
              type="pie"
              dataKey="count"
              nameKey="status"
            />
          </CardContent>
        </Card>
      </div>

      {/* Trade Volumes */}
      <Card>
        <CardHeader>
          <CardTitle>Top Trade Volumes</CardTitle>
          <CardDescription>
            Most active trades by work order count
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardChart 
            data={tradeVolumes || []} 
            type="bar"
            dataKey="count"
            xAxisKey="trade"
          />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivity 
          title="Recent Work Orders"
          items={recentWorkOrders || []}
          type="work-orders"
          isLoading={isLoading}
        />
        <RecentActivity 
          title="Recent Reports"
          items={recentReports || []}
          type="reports"
          isLoading={isLoading}
        />
      </div>

      {/* Recent Payments */}
      {metrics?.recentPayments && metrics.recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>
              Latest payments processed in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.internal_invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.subcontractor_name} • {format(new Date(payment.paid_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${payment.total_amount.toFixed(2)}</p>
                    {payment.payment_reference && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {payment.payment_reference}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
