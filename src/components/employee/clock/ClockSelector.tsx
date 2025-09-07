import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { WorkItemList } from '../work-items/WorkItemList';
import type { ClockOption } from './types';

interface ClockSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  options: ClockOption[];
  isLoading: boolean;
  onClockIn: (option: ClockOption) => void;
}

export const ClockSelector: React.FC<ClockSelectorProps> = ({
  isOpen,
  onOpenChange,
  options,
  isLoading,
  onClockIn
}) => {
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);

  const handleClockIn = () => {
    if (!selectedOption) return;
    
    onClockIn(selectedOption);
    
    // Reset state
    setSelectedOption(null);
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state when closing
      setSelectedOption(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] p-6">
        <SheetHeader className="mb-6">
          <SheetTitle>Select Work Order</SheetTitle>
          <SheetDescription>
            Choose a work order to begin tracking your time
          </SheetDescription>
        </SheetHeader>

        <WorkItemList
          selectedOption={selectedOption}
          onOptionSelect={setSelectedOption}
          isLoading={isLoading}
        />

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleClockIn}
            disabled={!selectedOption || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Clocking In...' : 'Clock In'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};