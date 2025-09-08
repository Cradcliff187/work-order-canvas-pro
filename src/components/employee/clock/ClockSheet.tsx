import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MobileBottomSheet } from '../mobile/MobileBottomSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClockTimer } from '@/hooks/useClockTimer';
import { WorkItemList } from '../work-items/WorkItemList';
import { ActiveSessionDisplay } from './ActiveSessionDisplay';
import { ClockSheetProps } from './types';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
  // Get elapsed time from timer hook
  const { elapsedTime } = useClockTimer();

  const handleClose = () => {
    onOpenChange(false);
  };

  const renderContent = () => (
    <>
      <div className="flex-1 overflow-hidden flex flex-col mb-6">
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
          className={cn(
            "flex-1",
            isMobile && "min-h-[48px] touch-manipulation"
          )}
        >
          Cancel
        </Button>
        
        <Button
          onClick={onClockAction}
          disabled={(!isClocked && !selectedOption) || isLoading}
          className={cn(
            "flex-1",
            isMobile && "min-h-[48px] touch-manipulation"
          )}
        >
          {isClocked ? 'Clock Out' : 'Clock In'}
        </Button>
      </div>
    </>
  );

  return isMobile ? (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title={isClocked ? 'Currently Clocked In' : 'Clock In to Work'}
      swipeToClose={true}
      backdropTapToClose={true}
      hapticFeedback={true}
      contentClassName="flex flex-col"
    >
      {renderContent()}
    </MobileBottomSheet>
  ) : (
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

        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}