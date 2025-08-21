import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, X } from 'lucide-react';
import { WorkSelector } from '@/components/employee/clock/WorkSelector';
import { TimePresets } from './TimePresets';
import { TimeRangeInputs } from './TimeRangeInputs';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useRetroactiveTimeEntry } from '@/hooks/useRetroactiveTimeEntry';
import { ClockOption } from '@/components/employee/clock/types';
import { RetroactiveTimeEntry, TimePreset } from './types';
import { useTodaysWork } from '@/hooks/useTodaysWork';

interface RetroactiveTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RetroactiveTimeModal: React.FC<RetroactiveTimeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('');

  const { data: allWorkItems = [], isLoading: workItemsLoading } = useAllWorkItems();
  const { addRetroactiveTime, isLoading: isSubmitting } = useRetroactiveTimeEntry();
  const { data: todaysWork = [] } = useTodaysWork();

  // Smart defaults: auto-select most recent work item
  React.useEffect(() => {
    if (!selectedOption && todaysWork.length > 0 && allWorkItems.length > 0) {
      const recentWorkItem = todaysWork[0]; // Most recent from today
      const matchingWorkItem = allWorkItems.find(item => item.id === recentWorkItem.id);
      
      if (matchingWorkItem && !matchingWorkItem.isCompleted) {
        setSelectedOption({
          id: matchingWorkItem.id,
          type: matchingWorkItem.type,
          title: matchingWorkItem.title,
          number: matchingWorkItem.number,
          section: matchingWorkItem.isAssignedToMe ? 'assigned' as const : 'available' as const,
        });
      }
    }
  }, [selectedOption, todaysWork, allWorkItems]);

  // Filter work items based on search query
  const filteredOptions = React.useMemo(() => {
    return allWorkItems
      .filter(item => !item.isCompleted)
      .map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        number: item.number,
        section: item.isAssignedToMe ? 'assigned' as const : 'available' as const,
      }))
      .filter(option => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          option.title.toLowerCase().includes(query) ||
          option.number.toLowerCase().includes(query)
        );
      });
  }, [allWorkItems, searchQuery]);

  const handlePresetSelect = (preset: TimePreset) => {
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    
    // If preset has a specific date, set it
    if (preset.date) {
      setDate(preset.date);
    }
  };

  const handleSubmit = () => {
    if (!selectedOption) return;

    const entry: RetroactiveTimeEntry = {
      workOrderId: selectedOption.type === 'work_order' ? selectedOption.id : undefined,
      projectId: selectedOption.type === 'project' ? selectedOption.id : undefined,
      startTime,
      endTime: endTime || undefined,
      date,
    };

    addRetroactiveTime(entry);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setSelectedOption(null);
    setSearchQuery('');
    setDate(new Date());
    setStartTime('08:00');
    setEndTime('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const isValidEntry = selectedOption && startTime && (!endTime || endTime > startTime);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-warning/20 rounded-full p-2">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <DialogTitle>Add Retroactive Time Entry</DialogTitle>
                <DialogDescription>
                  Add time for work completed earlier
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-warning text-warning bg-warning/10">
              Retroactive Entry
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* Work Selection */}
            <div className="space-y-3">
              <h4 className="font-medium">Select Work Item</h4>
              <div className="border rounded-lg">
                <div className="p-4 border-b">
                  <input
                    type="text"
                    placeholder="Search work items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {workItemsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading work items...
                    </div>
                  ) : (
                    <WorkSelector
                      options={filteredOptions}
                      selectedOption={selectedOption}
                      onOptionSelect={setSelectedOption}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Time Entry */}
            <div className="grid lg:grid-cols-2 gap-6">
              <TimeRangeInputs
                date={date}
                startTime={startTime}
                endTime={endTime}
                onDateChange={setDate}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
              
              <TimePresets onSelectPreset={handlePresetSelect} />
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValidEntry || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Adding Time...' : 'Add Time Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};