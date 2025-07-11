import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { 
  ClipboardList, 
  Clock, 
  Calendar,
  Receipt,
  FileText,
  Plus,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const {
    activeAssignments,
    hoursThisWeek,
    hoursThisMonth,
    recentReceipts,
    pendingTimeReports,
    totalHoursThisWeek,
    totalHoursThisMonth,
    monthlyExpenses,
    recentTimeReports,
    isLoading,
    isError
  } = useEmployeeDashboard();

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
        <h1 className="text-3xl font-bold mb-2">Employee Dashboard</h1>
        <p className="text-muted-foreground">Track your assignments, hours, and expenses</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{activeAssignments?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Currently assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{totalHoursThisWeek || 0}h</div>
            )}
            <p className="text-xs text-muted-foreground">Hours logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{totalHoursThisMonth || 0}h</div>
            )}
            <p className="text-xs text-muted-foreground">Total this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <div className="text-2xl font-bold">${(monthlyExpenses || 0).toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">Total this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Button 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/time-reports/new')}
        >
          <Plus className="h-5 w-5" />
          Submit Time Report
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/receipts/new')}
        >
          <Receipt className="h-5 w-5" />
          Add Receipt
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/work-orders')}
        >
          <ClipboardList className="h-5 w-5" />
          View Assignments
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/admin/time-reports')}
        >
          <Clock className="h-5 w-5" />
          Time Reports
        </Button>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
            <CardDescription>Your current work order assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : activeAssignments && activeAssignments.length > 0 ? (
              <div className="space-y-3">
                {activeAssignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{assignment.work_orders?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.work_orders?.work_order_number} • 
                        Assigned {format(new Date(assignment.assigned_at), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {assignment.assignment_type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No active assignments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Time Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Reports</CardTitle>
            <CardDescription>Your latest submitted time reports</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentTimeReports && recentTimeReports.length > 0 ? (
              <div className="space-y-3">
                {recentTimeReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(report.report_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.hours_worked}h • {report.work_orders?.work_order_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${(report.hours_worked * (report.hourly_rate_snapshot || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No time reports submitted
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Receipts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
            <CardDescription>Your latest expense receipts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentReceipts && recentReceipts.length > 0 ? (
              <div className="space-y-3">
                {recentReceipts.slice(0, 5).map((receipt) => (
                  <div key={receipt.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{receipt.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(receipt.receipt_date), 'MMM d, yyyy')} • 
                        {receipt.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ${receipt.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No receipts submitted
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>This Week's Progress</CardTitle>
            <CardDescription>Your hours and earnings this week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Hours</span>
                  </div>
                  <span className="text-2xl font-bold">{totalHoursThisWeek || 0}h</span>
                </div>
                
                {hoursThisWeek && hoursThisWeek.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Recent entries:</h4>
                    {hoursThisWeek.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="flex justify-between text-xs">
                        <span>{format(new Date(entry.report_date), 'EEE, MMM d')}</span>
                        <span>{entry.hours_worked}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;