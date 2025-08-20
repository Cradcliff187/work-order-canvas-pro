import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { FilterDropdown } from '@/components/employee/FilterDropdown';
import { CompactStatsRow } from '@/components/employee/CompactStatsRow';
import { SlimHeader } from '@/components/employee/SlimHeader';
import { SlimStatsBar } from '@/components/employee/SlimStatsBar';
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
    return (
      <div className="space-y-3 max-w-full">
        {/* Slim Header */}
        <SlimHeader firstName={profile?.first_name} isMobile={true} />

        {/* Hero Clock Card */}
        <ClockStatusCard 
          onClockOut={handleClockOut}
          isClockingOut={isClockingOut}
        />

        {/* Compact Stats Row */}
        <CompactStatsRow 
          todayHours={todayHours || 0}
          weekHours={totalHoursThisWeek || 0}
          activeCount={assignmentCounts.total || 0}
          isLoading={dashboardLoading}
        />

        {/* Tabbed Work Section */}
        <Tabs defaultValue="my-work" className="w-full">
          <div className="flex items-center justify-between mb-2">
            <TabsList className="grid grid-cols-2 w-auto">
              <TabsTrigger value="my-work" className="text-xs">
                My Work ({myAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="text-xs">
                Available ({otherWork.length})
              </TabsTrigger>
            </TabsList>
            <FilterDropdown 
              filters={filters} 
              onFilterChange={updateFilter}
              workCounts={workCounts}
            />
          </div>

          <TabsContent value="my-work" className="mt-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : myAssignments.length > 0 ? (
              <div className="flex flex-col gap-3">
                {myAssignments.slice(0, 5).map((workItem) => (
                  <WorkProjectCard
                    key={workItem.id}
                    workItem={workItem}
                    onClockIn={handleClockIn}
                    onViewDetails={handleViewDetails}
                    isDisabled={isClockingIn || isClockingOut}
                    variant="assigned"
                    className="w-full"
                  />
                ))}
              </div>
            ) : (
              <Card className="w-full bg-muted/30">
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No assignments yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="available" className="mt-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : otherWork.length > 0 ? (
              <div className="flex flex-col gap-3">
                {otherWork.slice(0, 5).map((workItem) => (
                  <WorkProjectCard
                    key={workItem.id}
                    workItem={workItem}
                    onClockIn={handleClockIn}
                    onViewDetails={handleViewDetails}
                    isDisabled={isClockingIn || isClockingOut}
                    variant="available"
                    className="w-full"
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
          </TabsContent>
        </Tabs>

        {/* Compact Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="h-12 flex-1 flex flex-col gap-1 text-xs"
            onClick={() => navigate('/employee/time-reports')}
          >
            <Plus className="h-3 w-3" />
            Time Report
          </Button>
          <Button 
            variant="outline" 
            className="h-12 flex-1 flex flex-col gap-1 text-xs"
            onClick={() => navigate('/employee/receipts')}
          >
            <Receipt className="h-3 w-3" />
            Add Receipt
          </Button>
        </div>
      </div>
    );
  }

  // Desktop design
  return (
    <div className="space-y-3">
      {/* Slim Header */}
      <SlimHeader firstName={profile?.first_name} isMobile={false} />

      {/* Hero Clock Card */}
      <ClockStatusCard 
        onClockOut={handleClockOut}
        isClockingOut={isClockingOut}
      />

      {/* Slim Stats Bar */}
      <SlimStatsBar 
        todayHours={todayHours || 0}
        weekHours={totalHoursThisWeek || 0}
        assignedCount={assignmentCounts.total || 0}
        availableCount={otherWork.length || 0}
        isLoading={dashboardLoading}
      />

      {/* Tabbed Work Section */}
      <Tabs defaultValue="my-work" className="w-full">
        <div className="flex items-center justify-between mb-3">
          <TabsList className="grid grid-cols-2 w-auto">
            <TabsTrigger value="my-work">
              My Work ({myAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              Available ({otherWork.length})
            </TabsTrigger>
          </TabsList>
          <FilterDropdown 
            filters={filters} 
            onFilterChange={updateFilter}
            workCounts={workCounts}
          />
        </div>

        <TabsContent value="my-work" className="mt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : myAssignments.length > 0 ? (
            <div className="flex flex-col gap-3">
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
        </TabsContent>

        <TabsContent value="available" className="mt-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : otherWork.length > 0 ? (
            <div className="flex flex-col gap-3">
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
        </TabsContent>
      </Tabs>

      {/* Compact Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Button 
          className="h-12 flex flex-col gap-1 text-sm"
          onClick={() => navigate('/employee/time-reports')}
        >
          <Plus className="h-4 w-4" />
          Time Report
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1 text-sm"
          onClick={() => navigate('/employee/receipts')}
        >
          <Receipt className="h-4 w-4" />
          Add Receipt
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1 text-sm"
          onClick={() => navigate('/employee/assignments')}
        >
          <ClipboardList className="h-4 w-4" />
          All Work
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex flex-col gap-1 text-sm"
          onClick={() => navigate('/employee/time-reports')}
        >
          <FileText className="h-4 w-4" />
          Reports
        </Button>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
