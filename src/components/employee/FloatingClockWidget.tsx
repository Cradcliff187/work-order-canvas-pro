import React, { useState } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import { useClockState } from '@/hooks/useClockState';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkOrderOption {
  id: string;
  title: string;
  work_order_number: string;
}

const FloatingClockWidget: React.FC = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string | null>(null);
  
  const clockData = useClockState();
  const { clockIn, clockOut, isClockingIn, isClockingOut } = clockData;
  const { activeAssignments } = useEmployeeDashboard();
  const isMobile = useIsMobile();
  const { triggerHaptic, onFieldSave, onSubmitSuccess, onError } = useHapticFeedback();

  // Format elapsed time to display (e.g., "2:34:15")
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get available work orders for clock in
  const workOrderOptions: WorkOrderOption[] = React.useMemo(() => {
    if (!activeAssignments) return [];
    return activeAssignments
      .filter(assignment => assignment.work_orders)
      .map(assignment => ({
        id: assignment.work_orders!.id,
        title: assignment.work_orders!.title,
        work_order_number: assignment.work_orders!.work_order_number,
      }));
  }, [activeAssignments]);

  // Handle FAB click
  const handleFabClick = () => {
    onFieldSave();
    setIsSheetOpen(true);
  };

  // Handle clock action
  const handleClockAction = async () => {
    try {
      if (clockData.isClocked) {
        // Clock out
        await clockOut.mutateAsync();
        onSubmitSuccess();
        setIsSheetOpen(false);
      } else {
        // Clock in - note: current hook doesn't support work order selection
        // It uses the most recent assignment automatically
        await clockIn.mutateAsync();
        onSubmitSuccess();
        setSelectedWorkOrder(null);
        setIsSheetOpen(false);
      }
    } catch (error) {
      onError();
    }
  };

  // FAB positioning classes
  const fabPositionClass = isMobile 
    ? "fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50" 
    : "fixed bottom-6 right-6 z-50";

  // FAB content
  const fabContent = clockData.isClocked ? (
    <div className="flex flex-col items-center justify-center">
      <Square className="h-5 w-5 mb-1" />
      <span className="text-xs font-mono font-semibold leading-none">
        {formatElapsedTime(clockData.elapsedTime)}
      </span>
    </div>
  ) : (
    <Clock className="h-6 w-6" />
  );

  const fabClasses = cn(
    "h-16 w-16 rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl",
    "flex items-center justify-center text-white",
    clockData.isClocked 
      ? "bg-success animate-pulse shadow-success/25" 
      : "bg-primary hover:bg-primary/90"
  );

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <button
            className={cn(fabPositionClass, fabClasses)}
            onClick={handleFabClick}
            aria-label={clockData.isClocked ? "Clock out" : "Clock in"}
          >
            {fabContent}
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>
              {clockData.isClocked ? "Clock Out" : "Clock In"}
            </SheetTitle>
            <SheetDescription>
              {clockData.isClocked 
                ? "End your current work session" 
                : "Start tracking time for a work order"
              }
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Current Status */}
            {clockData.isClocked && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Work Order:</span>
                    <Badge variant="secondary">
                      {clockData.workOrderId || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Elapsed Time:</span>
                    <span className="font-mono font-semibold">
                      {formatElapsedTime(clockData.elapsedTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Started:</span>
                    <span className="text-sm">
                      {clockData.clockInTime ? clockData.clockInTime.toLocaleTimeString() : 'Unknown'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Order Selection for Clock In */}
            {!clockData.isClocked && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Work Order</label>
                <div className="space-y-2">
                  {workOrderOptions.length > 0 ? (
                    workOrderOptions.map((workOrder) => (
                      <button
                        key={workOrder.id}
                        onClick={() => {
                          setSelectedWorkOrder(workOrder.id);
                          triggerHaptic();
                        }}
                        className={cn(
                          "w-full p-3 text-left border rounded-lg transition-colors",
                          selectedWorkOrder === workOrder.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium text-sm">{workOrder.work_order_number}</div>
                        <div className="text-sm text-muted-foreground">{workOrder.title}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active work orders assigned</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClockAction}
                disabled={
                  isClockingIn ||
                  isClockingOut
                }
                className="flex-1"
              >
                {isClockingIn || isClockingOut ? (
                  "Processing..."
                ) : clockData.isClocked ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Clock In
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FloatingClockWidget;