import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SearchBar } from './SearchBar';
import { WorkSelector } from './WorkSelector';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClockIn = () => {
    if (!selectedOption) return;
    
    onClockIn(selectedOption);
    
    // Reset state
    setSelectedOption(null);
    setSearchQuery('');
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state when closing
      setSelectedOption(null);
      setSearchQuery('');
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

        <div className="flex-1 overflow-hidden flex flex-col">
          <SearchBar 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          <div className="flex-1 overflow-y-auto">
            <WorkSelector
              options={filteredOptions}
              selectedOption={selectedOption}
              onOptionSelect={setSelectedOption}
            />
          </div>
        </div>

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