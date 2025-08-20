import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { BasicClockButton } from '@/components/employee/BasicClockButton';
import { useClockState } from '@/hooks/useClockState';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CompactMobileCard } from '@/components/admin/shared/CompactMobileCard';
import { SwipeableWorkOrderCard } from '@/components/employee/SwipeableWorkOrderCard';
import { 
  ClipboardList, 
  Clock, 
  Calendar,
  Receipt,
  FileText,
  Plus,
  DollarSign,
  TrendingUp,
  User,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { profile } = useAuth();
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

  const { clockIn, clockOut, isClockingIn, isClockingOut, isClocked, clockInTime, workOrderId, locationAddress } = useClockState();

  const handleClockIntoWorkOrder = (workOrderId: string) => {
    if (isClocked && workOrderId !== workOrderId) {
      toast({
        title: "Already clocked in",
        description: "Please clock out first before switching work orders",
        variant: "destructive"
      });
      return;
    }
    
    clockIn.mutate({ workOrderId });
  };

  const handleViewAssignmentDetails = (assignmentId: string) => {
    navigate(`/employee/assignments/${assignmentId}`);
  };

  const handleClockAction = () => {
    if (isClocked) {
      clockOut.mutate();
    } else {
      clockIn.mutate({});
    }
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

  if (isMobile) {
    // Mobile-first design
    return (
      <div className="space-y-4 pb-4">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 rounded-full p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Welcome back, {profile?.first_name || 'Employee'}!
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>
        </div>

        {/* Active Clock Card */}
        {isClocked && (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-success/20 rounded-full p-2">
                    <Clock className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Currently clocked in</p>
                    <p className="text-xs text-muted-foreground">
                      Since {clockInTime ? format(new Date(clockInTime), 'h:mm a') : '--'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-success text-success">
                  Active
                </Badge>
              </div>
              {locationAddress && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-success/20">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground truncate">{locationAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-lg font-bold">{totalHoursThisWeek || 0}h</p>
                </div>
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Assignments</p>
                  <p className="text-lg font-bold">{activeAssignments?.length || 0}</p>
                </div>
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-14 flex flex-col gap-1 text-xs"
            onClick={() => navigate('/employee/time-reports')}
          >
            <Plus className="h-4 w-4" />
            Time Report
          </Button>
          <Button 
            variant="outline" 
            className="h-14 flex flex-col gap-1 text-xs"
            onClick={() => navigate('/employee/receipts')}
          >
            <Receipt className="h-4 w-4" />
            Add Receipt
          </Button>
        </div>

        {/* Active Assignments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Active Assignments</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/employee/assignments')}
              className="text-xs"
            >
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : activeAssignments && activeAssignments.length > 0 ? (
            <div className="space-y-2">
              {activeAssignments.slice(0, 3).map((assignment) => (
                <SwipeableWorkOrderCard
                  key={assignment.id}
                  assignment={assignment}
                  onClockIn={handleClockIntoWorkOrder}
                  onViewDetails={handleViewAssignmentDetails}
                  isDisabled={isClockingIn || isClockingOut}
                  onClick={() => navigate(`/employee/assignments/${assignment.id}`)}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active assignments</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Recent Activity</h2>
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : recentTimeReports && recentTimeReports.length > 0 ? (
            <div className="space-y-2">
              {recentTimeReports.slice(0, 3).map((report) => (
                <CompactMobileCard
                  key={report.id}
                  title={format(new Date(report.report_date), 'MMM d, yyyy')}
                  subtitle={`${report.hours_worked}h • ${report.work_orders?.work_order_number}`}
                  trailing={
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${(report.hours_worked * (report.hourly_rate_snapshot || 0)).toFixed(2)}
                      </p>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Desktop design (unchanged)
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Track your assignments, hours, and expenses</p>
      </div>

      {/* Clock In/Out Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Time Clock</CardTitle>
          <CardDescription>Clock in and out of your work assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs mx-auto">
            <BasicClockButton 
              onClick={handleClockAction}
              loading={isClockingIn || isClockingOut}
            />
          </div>
        </CardContent>
      </Card>

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
          onClick={() => navigate('/employee/time-reports')}
        >
          <Plus className="h-5 w-5" />
          Submit Time Report
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/employee/receipts')}
        >
          <Receipt className="h-5 w-5" />
          Add Receipt
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/employee/time-reports')}
        >
          <ClipboardList className="h-5 w-5" />
          View Assignments
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/employee/time-reports')}
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