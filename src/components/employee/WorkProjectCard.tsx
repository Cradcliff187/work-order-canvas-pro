import React, { useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, BarChart, Briefcase, FileText, Eye, Loader2 } from 'lucide-react';
import { WorkItem } from '@/hooks/useAllWorkItems';
import { AssignmentBadge } from './AssignmentBadge';
import { StatusDot } from './StatusDot';
import { useWorkItemMetrics } from '@/hooks/useWorkItemMetrics';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useClockState } from '@/hooks/useClockState';
import { cn } from '@/lib/utils';

interface WorkProjectCardProps {
  workItem: WorkItem;
  onViewDetails: (id: string) => void;
  onClockIn: (workOrderId?: string, projectId?: string) => void;
  onClockOut?: () => void;
  variant?: 'assigned' | 'available';
  className?: string;
}

export const WorkProjectCard: React.FC<WorkProjectCardProps> = ({
  workItem,
  onViewDetails,
  onClockIn,
  onClockOut,
  variant = 'available',
  className
}) => {
  const { data: metrics } = useWorkItemMetrics(workItem.id, workItem.type);
  const isMobile = useIsMobile();
  const { onSwipeAction, onSubmitSuccess } = useHapticFeedback();
  const { isClocked, workOrderId, projectId, isClockingIn, isClockingOut } = useClockState();
  const x = useMotionValue(0);

  // Loading and drag states
  const isLoading = isClockingIn || isClockingOut;
  const isDragging = useTransform(x, (value) => Math.abs(value) > 5);

  // Spring configuration for smooth animations
  const springConfig = { type: "spring" as const, stiffness: 300, damping: 30 };

  // Determine if this item is currently active
  const isThisItemActive = isClocked && (
    (workItem.type === 'work_order' && workOrderId === workItem.id) ||
    (workItem.type === 'project' && projectId === workItem.id)
  );

  // Transform values for action backgrounds
  const rightOpacity = useTransform(x, [0, 40, 80], [0, 0.3, 1]);
  const leftOpacity = useTransform(x, [-80, -40, 0], [1, 0.3, 0]);

  // Handle drag end for swipe actions
  const handleDragEnd = useCallback((_event: any, info: { offset: { x: number } }) => {
    if (isLoading) return; // Prevent actions during loading
    
    const finalX = info.offset.x;
    
    if (finalX > 60) {
      // Right swipe - Clock action
      onSwipeAction(); // Haptic feedback
      if (isThisItemActive) {
        onClockOut?.();
      } else {
        if (workItem.type === 'work_order') {
          onClockIn(workItem.id);
        } else {
          onClockIn(undefined, workItem.id);
        }
      }
      onSubmitSuccess(); // Success haptic
    } else if (finalX < -60) {
      // Left swipe - View Details
      onSwipeAction(); // Haptic feedback
      onViewDetails(workItem.id);
    }
    
    // Spring-based snap back to center
    x.set(0);
  }, [isLoading, isThisItemActive, workItem, onClockIn, onClockOut, onViewDetails, onSwipeAction, onSubmitSuccess, x, springConfig]);

  // Map work item status to status dot status
  const getStatusDotStatus = () => {
    if (workItem.isAssignedToMe) {
      return workItem.status === 'in_progress' ? 'in_progress' : 'active';
    }
    if (workItem.status === 'estimate_needed') return 'pending';
    return 'available';
  };

  return (
    <div className="relative overflow-hidden will-change-transform">
      {/* Right action background - Clock action */}
      <motion.div 
        className={cn(
          "absolute inset-0 flex items-center justify-start px-4 rounded-xl",
          isThisItemActive ? "bg-red-500" : "bg-green-500"
        )}
        style={{ opacity: rightOpacity }}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Clock className="h-5 w-5 text-white" />
        )}
        <span className="text-white font-medium ml-2">
          {isLoading ? "Loading..." : (isThisItemActive ? "Clock Out" : "Clock In")}
        </span>
      </motion.div>
      
      {/* Left action background - View Details */}
      <motion.div 
        className="absolute inset-0 bg-primary flex items-center justify-end px-4 rounded-xl"
        style={{ opacity: leftOpacity }}
      >
        <span className="text-white font-medium mr-2">View Details</span>
        <Eye className="h-5 w-5 text-white" />
      </motion.div>
      
      {/* Main card content */}
      <motion.div 
        drag={isMobile && !isThisItemActive && !isLoading ? "x" : false}
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.2}
        transition={springConfig}
        onDrag={() => onSwipeAction()}
        onDragEnd={isLoading ? undefined : handleDragEnd}
        style={{ x }}
        className={cn(
          "relative w-full max-w-full overflow-hidden border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 min-w-0 group",
          "rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/20 active:scale-[0.98]",
          "transform-gpu backface-hidden will-change-transform",
          isLoading && "opacity-75 cursor-not-allowed",
          variant === 'assigned' && "bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-md",
          className
        )}
      >
        {/* Status Dot */}
        <StatusDot 
          status={getStatusDotStatus()}
          className="absolute top-2 left-2 z-10"
          size="sm"
        />
        
        <CardContent className="p-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            {/* Left side - Work info */}
            <div className="flex items-center gap-2 min-w-0 flex-1 pl-3">
              {/* Badge container with proper constraints */}
              <div className="flex items-center gap-1 shrink-0 max-w-[70%]">
                <AssignmentBadge 
                  isAssignedToMe={workItem.isAssignedToMe}
                  assigneeName={workItem.assigneeName}
                  showIcon={false}
                  className="shrink-0"
                />
                
                {/* Type badge - ultra compact on mobile */}
                <div className="shrink-0">
                  {workItem.type === 'work_order' ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-medium px-1 py-0.5 shrink-0">
                      <FileText className="h-2 w-2 hidden sm:inline" />
                      <span className="sm:hidden">WO</span>
                      <span className="hidden sm:inline">WORK ORDER</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-medium px-1 py-0.5 shrink-0">
                      <Briefcase className="h-2 w-2 hidden sm:inline" />
                      <span className="sm:hidden">PRJ</span>
                      <span className="hidden sm:inline">PROJECT</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Work details - with proper truncation */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground text-sm truncate">
                    {workItem.number}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {workItem.title}
                </p>
                
                {/* Mini metrics - show on larger screens */}
                <div className="hidden sm:flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  {metrics?.lastWorked && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[80px]">{metrics.lastWorked}</span>
                    </div>
                  )}
                  {metrics?.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[100px]">{metrics.location}</span>
                    </div>
                  )}
                  {metrics?.hoursLogged && (
                    <div className="flex items-center gap-1">
                      <BarChart className="h-2.5 w-2.5" />
                      <span>{metrics.hoursLogged}h</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className={cn(
              "flex items-center gap-1 shrink-0",
              isDragging && "pointer-events-none"
            )}>
              {/* Details button - only show if assigned */}
              {workItem.isAssignedToMe && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(workItem.id)}
                  className="h-7 px-2 text-xs shrink-0 hover:scale-105 transition-all duration-200 hover:shadow-sm"
                >
                  <span className="hidden sm:inline">Details</span>
                  <span className="sm:hidden">?</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </motion.div>
    </div>
  );
};