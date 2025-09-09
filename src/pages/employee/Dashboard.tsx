import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { SlimHeader } from '@/components/employee/SlimHeader';
import { SimpleFilterChips } from '@/components/employee/SimpleFilterChips';
import { ClockStatusCard } from '@/components/employee/ClockStatusCard';
import { SlimStatsBar } from '@/components/employee/SlimStatsBar';
import { ActiveWorkCard } from '@/components/employee/ActiveWorkCard';
import { useNavigate } from 'react-router-dom';
import { useAssignmentCounts } from '@/hooks/useAssignmentCounts';
import { ActiveTimerBar } from '@/components/employee/ActiveTimerBar';
import { DebugProfile } from '@/components/employee/DebugProfile';
import { Receipt, Plus, Star } from 'lucide-react';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    totalHoursThisWeek,
    totalHoursThisMonth,
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


  const handleClockOut = () => {
    clockOut.mutate(false);
  };

  const handleViewDetails = (id: string) => {
    // Navigate to assignment details
    navigate(`/employee/assignments/${id}`);
  };

  const handleClockIn = (workOrderId?: string, projectId?: string) => {
    console.log('Dashboard clock-in:', { workOrderId, projectId });
    if (workOrderId) {
      clockIn.mutate({ workOrderId });
    } else if (projectId) {
      clockIn.mutate({ projectId });
    } else {
      console.error('No workOrderId or projectId provided to clock-in');
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-2">
      {/* Slim Header */}
      <SlimHeader firstName={profile?.first_name} />

      {/* Debug Profile Info */}
      <DebugProfile />

      {/* Hero Clock Card */}
      <ClockStatusCard 
        onClockOut={handleClockOut}
        isClockingOut={isClockingOut}
      />

      {/* Active Timer Bar */}
      <ActiveTimerBar />

      {/* Unified Stats Bar */}
      <SlimStatsBar 
        todayHours={todayHours || 0}
        weekHours={totalHoursThisWeek || 0}
        assignedCount={assignmentCounts.total || 0}
        availableCount={filteredWorkItems.length || 0}
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredWorkItems.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredWorkItems.map((workItem) => (
            <ActiveWorkCard
              key={workItem.id}
              workItem={workItem}
              onClockIn={handleClockIn}
              onViewDetails={handleViewDetails}
              isDisabled={isClockingIn}
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

      {/* Quick Actions - Only Time Report and Receipt */}
      <div className="flex gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-2">
        <Button 
          className="h-12 flex-1 sm:flex-none flex flex-col gap-1 text-sm"
          onClick={() => navigate('/employee/time-reports')}
        >
          <Plus className="h-4 w-4" />
          Time Report
        </Button>
        <Button 
          variant="outline" 
          className="h-12 flex-1 sm:flex-none flex flex-col gap-1 text-sm"
          onClick={() => navigate('/employee/receipts')}
        >
          <Receipt className="h-4 w-4" />
          Add Receipt
        </Button>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
