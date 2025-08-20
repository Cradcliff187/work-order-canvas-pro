import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { FilterChips } from '@/components/employee/FilterChips';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAssignmentCounts } from '@/hooks/useAssignmentCounts';
import { ClockStatusCard } from '@/components/employee/ClockStatusCard';
import { WorkProjectCard } from '@/components/employee/WorkProjectCard';
import { 
  ClipboardList, 
  Clock, 
  Calendar,
  Receipt,
  FileText,
  Plus,
  DollarSign,
  Star,
  Eye,
  User,
  Flame,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const {
    totalHoursThisWeek,
    totalHoursThisMonth,
    monthlyExpenses,
    isLoading: dashboardLoading,
    isError
  } = useEmployeeDashboard();

  const { clockIn, clockOut, isClockingIn, isClockingOut } = useClockState();
  const { data: allWorkItems, isLoading: workItemsLoading } = useAllWorkItems();
  const { data: todayHours, isLoading: todayHoursLoading } = useTodayHours();
  const { filters, updateFilter } = useDashboardFilters();
  const { data: assignmentCounts = { workOrders: 0, projects: 0, total: 0 } } = useAssignmentCounts();

  const isLoading = dashboardLoading || workItemsLoading || todayHoursLoading;

  // Apply filters to work items
  const filteredWorkItems = React.useMemo(() => {
    let items = allWorkItems || [];
    
    // Apply completed filter
    if (filters.hideCompleted) {
      items = items.filter(item => !item.isCompleted);
    }
    
    // Apply work type filters
    items = items.filter(item => {
      if (item.type === 'project') return filters.showProjects;
      if (item.type === 'work_order') return filters.showWorkOrders;
      return true;
    });
    
    return items;
  }, [allWorkItems, filters]);

  // Filter work items by assignment status
  const myAssignments = filteredWorkItems.filter(item => item.isAssignedToMe);
  const otherWork = filters.showMyWorkOnly ? [] : filteredWorkItems.filter(item => !item.isAssignedToMe);

  // Debug assignment counts
  React.useEffect(() => {
    if (allWorkItems) {
      console.log('🔍 Assignment Debug Info:');
      console.log('Profile ID:', profile?.id);
      console.log('All work items count:', allWorkItems.length);
      console.log('My assignments count:', myAssignments.length);
      console.log('Work items breakdown:', {
        projects: allWorkItems.filter(item => item.type === 'project').length,
        workOrders: allWorkItems.filter(item => item.type === 'work_order').length,
        assignedToMe: allWorkItems.filter(item => item.isAssignedToMe).length,
      });
      console.log('All work items:', allWorkItems);
    }
  }, [allWorkItems, myAssignments.length, profile?.id]);

  // Calculate work counts for filter chips
  const workCounts = React.useMemo(() => {
    const all = allWorkItems || [];
    return {
      myWork: all.filter(item => item.isAssignedToMe).length,
      totalWork: all.length,
      projects: all.filter(item => item.type === 'project').length,
      workOrders: all.filter(item => item.type === 'work_order').length,
    };
  }, [allWorkItems]);

  const handleClockIn = (workOrderId?: string, projectId?: string) => {
    if (workOrderId) {
      clockIn.mutate({ workOrderId });
    } else if (projectId) {
      clockIn.mutate({ projectId });
    } else {
      clockIn.mutate({});
    }
  };

  const handleClockOut = () => {
    clockOut.mutate(false);
  };

  const handleViewDetails = (id: string) => {
    // Navigate to work order or project details
    navigate(`/employee/work-items/${id}`);
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
      <div className="w-full max-w-full overflow-hidden space-y-4 pb-4">
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

        {/* Current Clock Status */}
        <ClockStatusCard 
          onClockOut={handleClockOut}
          isClockingOut={isClockingOut}
        />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 border-2 border-red-500">
          <Card className="bg-card border-2 border-blue-500">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Today</p>
                <p className="text-lg font-bold">{todayHours || 0}h</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-2 border-blue-500">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">This Week</p>
                <p className="text-lg font-bold">{totalHoursThisWeek || 0}h</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-blue-500">
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Assigned</p>
                <p className="text-lg font-bold">{assignmentCounts.total}</p>
                <p className="text-[10px] text-muted-foreground">
                  {assignmentCounts.projects}p, {assignmentCounts.workOrders}w
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Chips */}
        <div className="border-2 border-red-500">
          <FilterChips 
            filters={filters} 
            onFilterChange={updateFilter}
            workCounts={workCounts}
          />
        </div>

        {/* My Active Assignments */}
        <div className="w-full overflow-x-hidden space-y-3 border-2 border-red-500">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-success" />
            <h2 className="font-semibold text-base">My Active Assignments</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : myAssignments.length > 0 ? (
            <div className="space-y-2 border-2 border-blue-500">
              {myAssignments.slice(0, 3).map((workItem) => (
                <WorkProjectCard
                  key={workItem.id}
                  workItem={workItem}
                  onClockIn={handleClockIn}
                  onViewDetails={handleViewDetails}
                  isDisabled={isClockingIn || isClockingOut}
                  variant="assigned"
                  className="w-full mb-3 border-2 border-green-500"
                />
              ))}
            </div>
          ) : (
            <Card className="w-full mb-3 bg-muted/30 border-2 border-green-500">
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Other Available Work */}
        <div className="w-full overflow-x-hidden space-y-3 border-2 border-red-500">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-base">Other Available Work</h2>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : otherWork.length > 0 ? (
            <div className="space-y-2 border-2 border-blue-500">
              {otherWork.slice(0, 5).map((workItem) => (
                <WorkProjectCard
                  key={workItem.id}
                  workItem={workItem}
                  onClockIn={handleClockIn}
                  onViewDetails={handleViewDetails}
                  isDisabled={isClockingIn || isClockingOut}
                  variant="available"
                  className="w-full mb-3 border-2 border-green-500"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="All work is assigned!"
              description="Ask your manager if you want to help with other tasks"
              variant="card"
            />
          )}
        </div>

        {/* Quick Actions */}
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
      </div>
    );
  }

  // Desktop design
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Track your assignments, hours, and expenses</p>
      </div>

      {/* Current Clock Status */}
      <ClockStatusCard 
        onClockOut={handleClockOut}
        isClockingOut={isClockingOut}
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{todayHours || 0}h</div>
            )}
            <p className="text-xs text-muted-foreground">Hours today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Assigned Work</CardTitle>
            <Star className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{assignmentCounts.total}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {assignmentCounts.projects > 0 && assignmentCounts.workOrders > 0
                ? `${assignmentCounts.projects} projects, ${assignmentCounts.workOrders} work orders`
                : assignmentCounts.projects > 0
                ? `${assignmentCounts.projects} projects`
                : assignmentCounts.workOrders > 0
                ? `${assignmentCounts.workOrders} work orders`
                : 'None assigned'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Work</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{otherWork.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Can jump in</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Chips */}
      <FilterChips 
        filters={filters} 
        onFilterChange={updateFilter}
        workCounts={workCounts}
      />

      {/* Work Layout - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Active Assignments - Left Column (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-success" />
                <CardTitle>My Active Assignments</CardTitle>
              </div>
              <CardDescription>Work assigned specifically to you</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : myAssignments.length > 0 ? (
                <div className="space-y-3">
                  {myAssignments.map((workItem) => (
                    <WorkProjectCard
                      key={workItem.id}
                      workItem={workItem}
                      onClockIn={handleClockIn}
                      onViewDetails={handleViewDetails}
                      isDisabled={isClockingIn || isClockingOut}
                      variant="assigned"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p>No assignments yet</p>
                  <p className="text-sm">Check back later or browse available work</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Other Available Work - Right Column (1/3 width) */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Other Available Work</CardTitle>
              </div>
              <CardDescription>Work you can jump into</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : otherWork.length > 0 ? (
                <div className="space-y-2">
                  {otherWork.slice(0, 8).map((workItem) => (
                    <WorkProjectCard
                      key={workItem.id}
                      workItem={workItem}
                      onClockIn={handleClockIn}
                      onViewDetails={handleViewDetails}
                      isDisabled={isClockingIn || isClockingOut}
                      variant="available"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="All work is assigned!"
                  description="Ask your manager if you want to help with other tasks"
                  variant="full"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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
          onClick={() => navigate('/employee/assignments')}
        >
          <ClipboardList className="h-5 w-5" />
          View All Work
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => navigate('/employee/time-reports')}
        >
          <FileText className="h-5 w-5" />
          Time Reports
        </Button>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
