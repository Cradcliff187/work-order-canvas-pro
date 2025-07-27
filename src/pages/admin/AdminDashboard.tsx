import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  ClipboardList,
  Users as UsersIcon,
  DollarSign
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

import { ExecutiveSummary } from '@/components/admin/dashboard/ExecutiveSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = {
  received: 'hsl(var(--primary))',
  assigned: 'hsl(var(--warning))', 
  in_progress: 'hsl(210 95% 56%)',
  completed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--destructive))',
};

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

  const navigateToInvoices = (filter?: string) => {
    const params = new URLSearchParams();
    if (filter === 'pending') {
      params.set('status', 'submitted');
    } else if (filter === 'unpaid') {
      params.set('paymentStatus', 'unpaid');
      params.set('status', 'approved');
    } else if (filter === 'paid') {
      params.set('paymentStatus', 'paid');
    }
    navigate(`/admin/invoices?${params.toString()}`);
  };

  if (isError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Dashboard</h1>
          <p className="text-muted-foreground">Please try refreshing the page or check your connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor system performance and manage work orders</p>
      </div>

      <Tabs defaultValue="executive" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="dashboard">Overview</TabsTrigger>
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-8">
          {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="gradient-card-responsive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{metrics?.totalWorkOrders.current || 0}</div>
                {metrics?.totalWorkOrders.trend && (
                  <div className="flex items-center gap-1">
                    {metrics.totalWorkOrders.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : metrics.totalWorkOrders.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-3 w-20" />
              ) : (
                `${metrics?.totalWorkOrders.lastMonth || 0} last month`
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card-responsive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.pendingAssignments || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigateToInvoices('pending')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-warning">{metrics?.pendingInvoices || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigateToInvoices('unpaid')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-success">{metrics?.unpaidApprovedInvoices || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Ready for payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Second row - Additional metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees On Duty</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-primary">{metrics?.employeesOnDuty || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Active last 3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Work Orders</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{metrics?.overdueWorkOrders || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-success">{metrics?.completedThisMonth || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigateToInvoices('paid')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-8 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-primary">{metrics?.recentPayments.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                ${(metrics?.recentPayments.reduce((sum, payment) => sum + payment.total_amount, 0) || 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Work Orders by Status</CardTitle>
            <CardDescription>Distribution of current work order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : statusDistribution && statusDistribution.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: "Count" }
                }}
                className="h-48"
              >
                <PieChart width={300} height={192}>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="count"
                    label={({ status, percentage }) => `${status} (${percentage}%)`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.status.toLowerCase().replace(' ', '_')] || 'hsl(var(--muted))'} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Submissions Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Submissions</CardTitle>
            <CardDescription>Work orders submitted in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : dailySubmissions && dailySubmissions.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: "Submissions", color: "hsl(var(--primary))" }
                }}
                className="h-48"
              >
                <LineChart width={300} height={192} data={dailySubmissions}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).getDate().toString()}
                  />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Trades Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Trades</CardTitle>
            <CardDescription>Most active trades by work order volume</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : tradeVolumes && tradeVolumes.length > 0 ? (
              <ChartContainer
                config={{
                  count: { label: "Work Orders", color: "hsl(var(--primary))" }
                }}
                className="h-48"
              >
                <BarChart width={300} height={192} data={tradeVolumes} layout="horizontal">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="trade" width={80} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" key="trade-count-bar" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Button className="h-16 flex flex-col gap-1">
          <Plus className="h-5 w-5" />
          Create Work Order
        </Button>
        <Button variant="outline" className="h-16 flex flex-col gap-1">
          <UsersIcon className="h-5 w-5" />
          View Unassigned
        </Button>
        <Button variant="outline" className="h-16 flex flex-col gap-1">
          <ClipboardList className="h-5 w-5" />
          Pending Reports
        </Button>
        <Button variant="outline" className="h-16 flex flex-col gap-1">
          <FileText className="h-5 w-5" />
          All Work Orders
        </Button>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
            <CardDescription>Latest work orders in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentWorkOrders && recentWorkOrders.length > 0 ? (
              <div className="space-y-3">
                {recentWorkOrders.map((workOrder) => (
                  <div key={workOrder.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{workOrder.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {workOrder.work_order_number} • {new Date(workOrder.created_at).toLocaleDateString()}
                        {workOrder.assigned_to_name && ` • ${workOrder.assigned_to_name}`}
                      </p>
                    </div>
                    <Badge variant={workOrder.status === 'completed' ? 'default' : 'secondary'}>
                      {workOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent work orders
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Latest submitted work order reports</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentReports && recentReports.length > 0 ? (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{report.work_order_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.work_order_number} • {report.subcontractor_name} • {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={report.status === 'approved' ? 'default' : 'secondary'}>
                      {report.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent reports
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest processed payments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : metrics?.recentPayments && metrics.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {metrics.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{payment.internal_invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.subcontractor_name} • {format(new Date(payment.paid_at), 'MMM d')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                        ${payment.total_amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_reference?.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent payments
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>
        
        <TabsContent value="executive" className="space-y-6">
          <ExecutiveSummary />
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

export default AdminDashboard;