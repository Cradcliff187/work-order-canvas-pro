import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Clock, MapPin } from 'lucide-react';
import { useClockTimer } from '@/hooks/useClockTimer';
import { SearchBar } from './SearchBar';
import { WorkSelector } from './WorkSelector';
import { ClockSheetProps } from './types';

export function ClockSheet({
  isOpen,
  onOpenChange,
  isClocked,
  clockInTime,
  workOrderId,
  projectId,
  selectedOption,
  searchQuery,
  filteredOptions,
  isLoading,
  onSearchChange,
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
            // Show current session details
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Active Session</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatElapsedTime(elapsedTime)}
                </div>
              </div>
              
              {(workOrderId || projectId) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">
                      {workOrderId ? `Work Order: ${workOrderId}` : `Project: ${projectId}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Show work item selection
            <div className="flex-1 overflow-hidden flex flex-col">
              <SearchBar 
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
              />
              
              <div className="flex-1 overflow-y-auto">
                <WorkSelector
                  options={filteredOptions}
                  selectedOption={selectedOption}
                  onOptionSelect={onOptionSelect}
                />
              </div>
            </div>
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