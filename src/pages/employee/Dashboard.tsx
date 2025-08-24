import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { SlimHeader } from '@/components/employee/SlimHeader';
import { SimpleFilterChips } from '@/components/employee/SimpleFilterChips';
import { ClockStatusCard } from '@/components/employee/ClockStatusCard';
import { CompactStatsRow } from '@/components/employee/CompactStatsRow';
import { SlimStatsBar } from '@/components/employee/SlimStatsBar';
import { WorkProjectCard } from '@/components/employee/WorkProjectCard';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAssignmentCounts } from '@/hooks/useAssignmentCounts';
import { RetroactiveTimeCard } from '@/components/employee/RetroactiveTimeCard';
import { RetroactiveTimeModal } from '@/components/employee/retroactive/RetroactiveTimeModal';
import { ActiveTimerBar } from '@/components/employee/ActiveTimerBar';
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
  const [showRetroactiveModal, setShowRetroactiveModal] = React.useState(false);

  const isLoading = dashboardLoading || workItemsLoading || todayHoursLoading;

  // Apply filters to work items
  const filteredWorkItems = React.useMemo(() => {
    let items = allWorkItems || [];
    
    // Always filter out completed
    items = items.filter(item => !item.isCompleted);
    
    // If showing only my work, filter by assignment first
    if (filters.showMyWorkOnly) {
      items = items.filter(item => item.isAssignedToMe);
    }
    
    // Only apply type filters if NOT in "My Work" mode
    if (!filters.showMyWorkOnly) {
      items = items.filter(item => {
        if (!filters.showProjects && item.type === 'project') return false;
        if (!filters.showWorkOrders && item.type === 'work_order') return false;
        return true;
      });
    }
    
    return items;
  }, [allWorkItems, filters]);

  // Removed debug logging for performance

  // Calculate work counts for filter chips
  const workCounts = React.useMemo(() => {
    const all = (allWorkItems || []).filter(item => !item.isCompleted);
    return {
      myWork: all.filter(item => item.isAssignedToMe).length,
      total: all.length,
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
    // Navigate to assignment details
    navigate(`/employee/assignments/${id}`);
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

  if (isLoading) {
    return <DashboardSkeleton isMobile={isMobile} />;
  }

  if (isMobile) {
    return (
      <div className="space-y-2 max-w-full overflow-hidden px-0">
        {/* Slim Header */}
        <SlimHeader firstName={profile?.first_name} isMobile={true} />

        {/* Hero Clock Card */}
        <ClockStatusCard 
          onClockOut={handleClockOut}
          isClockingOut={isClockingOut}
        />

        {/* Retroactive Time Card */}
        <RetroactiveTimeCard onOpenModal={() => setShowRetroactiveModal(true)} />

        {/* Active Timer Bar */}
        <ActiveTimerBar />

        {/* Compact Stats Row */}
        <CompactStatsRow 
          todayHours={todayHours || 0}
          weekHours={totalHoursThisWeek || 0}
          activeCount={assignmentCounts.total || 0}
          isLoading={dashboardLoading}
        />

        {/* Simple Filter Chips */}
        <SimpleFilterChips 
          filters={filters}
          onFilterChange={updateFilter}
          workCounts={workCounts}
        />

        {/* Work Items Section */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredWorkItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredWorkItems.slice(0, 8).map((workItem) => (
              <WorkProjectCard
                key={workItem.id}
                workItem={workItem}
                onViewDetails={handleViewDetails}
                onClockIn={handleClockIn}
                onClockOut={handleClockOut}
                variant={workItem.isAssignedToMe ? "assigned" : "available"}
                className="w-full"
              />
            ))}
          </div>
        ) : (
          <Card className="w-full bg-muted/30">
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {filters.showMyWorkOnly ? "No assignments yet" : "No work available"}
              </p>
            </CardContent>
          </Card>
        )}

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

  return (
    <div className="space-y-2">
      {/* Slim Header */}
      <SlimHeader firstName={profile?.first_name} isMobile={false} />

        {/* Hero Clock Card */}
        <ClockStatusCard 
          onClockOut={handleClockOut}
          isClockingOut={isClockingOut}
        />

        {/* Retroactive Time Card */}
        <RetroactiveTimeCard onOpenModal={() => setShowRetroactiveModal(true)} />

        {/* Active Timer Bar */}
        <ActiveTimerBar />

      {/* Slim Stats Bar */}
      <SlimStatsBar 
        todayHours={todayHours || 0}
        weekHours={totalHoursThisWeek || 0}
        assignedCount={assignmentCounts.total || 0}
        availableCount={filteredWorkItems.length || 0}
        isLoading={dashboardLoading}
      />

      {/* Simple Filter Chips */}
      <SimpleFilterChips 
        filters={filters}
        onFilterChange={updateFilter}
        workCounts={workCounts}
      />

      {/* Work Items Section */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredWorkItems.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredWorkItems.map((workItem) => (
            <WorkProjectCard
              key={workItem.id}
              workItem={workItem}
              onViewDetails={handleViewDetails}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              variant={workItem.isAssignedToMe ? "assigned" : "available"}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p>{filters.showMyWorkOnly ? "No assignments yet" : "No work available"}</p>
          <p className="text-sm">
            {filters.showMyWorkOnly 
              ? "Toggle 'My Work' off to see available work" 
              : "Try adjusting your filters"
            }
          </p>
        </div>
      )}

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

      {/* Retroactive Time Modal */}
      <RetroactiveTimeModal 
        isOpen={showRetroactiveModal}
        onClose={() => setShowRetroactiveModal(false)}
      />
    </div>
  );
};

export default EmployeeDashboard;
