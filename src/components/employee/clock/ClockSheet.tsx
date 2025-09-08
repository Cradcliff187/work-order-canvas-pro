import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useClockTimer } from '@/hooks/useClockTimer';
import { WorkItemList } from '../work-items/WorkItemList';
import { ActiveSessionDisplay } from './ActiveSessionDisplay';
import { ClockSheetProps } from './types';

export function ClockSheet({
  isOpen,
  onOpenChange,
  isClocked,
  clockInTime,
  workOrderId,
  projectId,
  selectedOption,
  isLoading,
  onOptionSelect,
  onCancel,
  onClockAction,
  formatElapsedTime
}: ClockSheetProps) {
  // Get elapsed time from timer hook
  const { elapsedTime } = useClockTimer();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-left">
            {isClocked ? 'Currently Clocked In' : 'Clock In to Work'}
          </SheetTitle>
          <SheetDescription className="text-left">
            {isClocked 
              ? 'You are currently tracking time. Tap "Clock Out" to end your session.'
              : 'Select a work item to begin tracking your time.'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isClocked ? (
            <ActiveSessionDisplay
              workOrderId={workOrderId}
              projectId={projectId}
              elapsedTime={elapsedTime}
              formatElapsedTime={formatElapsedTime}
            />
          ) : (
            <WorkItemList
              selectedOption={selectedOption}
              onOptionSelect={onOptionSelect}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          
          <Button
            onClick={onClockAction}
            disabled={(!isClocked && !selectedOption) || isLoading}
            className="flex-1"
          >
            {isClocked ? 'Clock Out' : 'Clock In'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}