import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useClockState } from '@/hooks/useClockState';
import { useTodaysWork } from '@/hooks/useTodaysWork';
import { SlimHeader } from '@/components/employee/SlimHeader';
import { ActiveWorkCard } from '@/components/employee/ActiveWorkCard';
import { Clock } from 'lucide-react';
import type { WorkItem } from '@/hooks/useAllWorkItems';

const DailyRoute = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { clockIn, isClockingIn } = useClockState();
  const { data: todaysWork, isLoading, isError } = useTodaysWork();

  // Convert TodaysWorkItem to WorkItem format for ActiveWorkCard
  const todayWorkItems: WorkItem[] = React.useMemo(() => {
    if (!todaysWork) return [];
    
    return todaysWork.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      number: item.number,
      isAssignedToMe: true,
      isCompleted: false,
      status: 'in_progress', // Default status for worked items
      // Convert TodaysWorkItem fields to WorkItem format
      work_order_number: item.type === 'work_order' ? item.number : undefined,
      project_number: item.type === 'project' ? item.number : undefined,
      name: item.type === 'project' ? item.title : undefined,
    }));
  }, [todaysWork]);

  const handleViewDetails = (id: string) => {
    navigate(`/employee/assignments/${id}`);
  };

  const handleClockIn = (workOrderId?: string, projectId?: string) => {
    clockIn.mutate({ workOrderId, projectId });
  };

  if (isError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Daily Route</h1>
          <p className="text-muted-foreground">Please try refreshing the page or check your connection.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <SlimHeader firstName={profile?.first_name} />

      {/* Daily Route Title */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Today's Work Route</h2>
      </div>

      {/* Work Items List */}
      {todayWorkItems.length > 0 ? (
        <div className="space-y-3">
          {todayWorkItems.map((workItem, index) => (
            <div key={workItem.id} className="flex items-start gap-3">
              {/* Number Badge */}
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-2">
                {index + 1}
              </div>
              
              {/* Work Card */}
              <div className="flex-1">
                <ActiveWorkCard
                  workItem={workItem}
                  onClockIn={handleClockIn}
                  onViewDetails={handleViewDetails}
                  isDisabled={isClockingIn}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No work completed today</p>
          <p className="text-sm">Start working on assignments to see your daily route</p>
        </div>
      )}
    </div>
  );
};

export default DailyRoute;