import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Play, Square, MapPin, Calendar, Star, History, Folder, Search, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useClockState } from '@/hooks/useClockState';
import { useEmployeeDashboard } from '@/hooks/useEmployeeDashboard';
import { useAllWorkItems, WorkItem } from '@/hooks/useAllWorkItems';
import { useRecentlyClocked, RecentClockItem } from '@/hooks/useRecentlyClocked';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkItemCard } from './WorkItemCard';

interface ClockOption {
  id: string;
  type: 'work_order' | 'project';
  title: string;
  number: string;
  section: 'assigned' | 'recent' | 'available';
  assigneeName?: string;
}

export function FloatingClockWidget() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const clockData = useClockState();
  const { clockIn, clockOut, isClockingIn, isClockingOut } = clockData;
  const { activeAssignments } = useEmployeeDashboard();
  const { data: allWorkItems = [] } = useAllWorkItems();
  const { data: recentItems = [] } = useRecentlyClocked();
  const isMobile = useIsMobile();
  const { triggerHaptic, onFieldSave, onSubmitSuccess, onError } = useHapticFeedback();
  const { toast } = useToast();

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Organize work items into smart sections
  const clockOptions: ClockOption[] = useMemo(() => {
    const options: ClockOption[] = [];
    const assignedIds = new Set<string>();
    const recentIds = new Set<string>();

    // My Assignments section
    allWorkItems
      .filter(item => item.isAssignedToMe)
      .forEach(item => {
        const key = `${item.type}_${item.id}`;
        assignedIds.add(key);
        options.push({
          id: item.id,
          type: item.type,
          title: item.title,
          number: item.number,
          section: 'assigned'
        });
      });

    // Recently Clocked section (excluding already assigned items)
    recentItems.forEach(item => {
      const key = `${item.type}_${item.id}`;
      if (!assignedIds.has(key)) {
        recentIds.add(key);
        options.push({
          id: item.id,
          type: item.type,
          title: item.title,
          number: item.number,
          section: 'recent'
        });
      }
    });

    // All Available section (excluding assigned and recent items)
    allWorkItems
      .filter(item => {
        const key = `${item.type}_${item.id}`;
        return !assignedIds.has(key) && !recentIds.has(key);
      })
      .forEach(item => {
        options.push({
          id: item.id,
          type: item.type,
          title: item.title,
          number: item.number,
          section: 'available',
          assigneeName: item.assigneeName
        });
      });

    return options;
  }, [allWorkItems, recentItems]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return clockOptions;
    
    const query = searchQuery.toLowerCase();
    return clockOptions.filter(option => 
      option.number.toLowerCase().includes(query) ||
      option.title.toLowerCase().includes(query) ||
      option.assigneeName?.toLowerCase().includes(query)
    );
  }, [clockOptions, searchQuery]);

  const handleFabClick = () => {
    onFieldSave();
    setIsSheetOpen(true);
  };

  const handleClockAction = async () => {
    if (!clockData.isClocked && !selectedOption) {
      toast({
        title: "Selection Required",
        description: "Please select a work order or project before clocking in.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (clockData.isClocked) {
        await clockOut.mutateAsync(false);
        onSubmitSuccess();
        setIsSheetOpen(false);
      } else if (selectedOption) {
        if (selectedOption.type === 'work_order') {
          await clockIn.mutateAsync({ workOrderId: selectedOption.id });
        } else {
          await clockIn.mutateAsync({ projectId: selectedOption.id });
        }
        onSubmitSuccess();
        setSelectedOption(null);
        setIsSheetOpen(false);
      }
    } catch (error) {
      onError();
      console.error('Clock action failed:', error);
    }
  };

  // FAB positioning classes
  const fabPositionClass = isMobile 
    ? "fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50" 
    : "fixed bottom-6 right-6 z-50";

  // FAB content - show elapsed time in milliseconds converted to seconds
  const fabContent = clockData.isClocked ? (
    <div className="flex flex-col items-center justify-center">
      <Square className="h-5 w-5 mb-1" />
      <span className="text-xs font-mono font-semibold leading-none">
        {formatElapsedTime(Math.floor(clockData.elapsedTime / 1000))}
      </span>
    </div>
  ) : (
    <Clock className="h-6 w-6" />
  );

  const fabClasses = cn(
    "h-16 w-16 rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl",
    "flex items-center justify-center text-white",
    clockData.isClocked 
      ? "bg-green-600 animate-pulse shadow-green-600/25" 
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

        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {clockData.isClocked ? 'Clock Out' : 'Clock In'}
            </SheetTitle>
            <SheetDescription>
              {clockData.isClocked 
                ? 'End your current work session' 
                : 'Select work to begin tracking time'
              }
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {clockData.isClocked ? (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    Current Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {clockData.workOrderId ? 'Work Order:' : 'Project:'}
                    </span>
                    <span className="font-medium">
                      {clockData.workOrderId || clockData.projectId || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Time Elapsed:</span>
                    <span className="font-mono text-lg font-bold text-green-600">
                      {formatElapsedTime(Math.floor(clockData.elapsedTime / 1000))}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Started:</span>
                    <span className="text-sm">
                      {clockData.clockInTime 
                        ? formatDistanceToNow(clockData.clockInTime, { addSuffix: true })
                        : 'N/A'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search work orders and projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* My Assignments Section */}
                {filteredOptions.filter(opt => opt.section === 'assigned').length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <Star className="h-4 w-4" />
                      ⭐ My Assignments
                    </div>
                    <div className="space-y-2">
                      {filteredOptions
                        .filter(opt => opt.section === 'assigned')
                        .map((option) => (
                          <WorkItemCard
                            key={`${option.type}_${option.id}`}
                            option={option}
                            isSelected={selectedOption?.id === option.id && selectedOption?.type === option.type}
                            onSelect={setSelectedOption}
                            className="bg-green-50 border-green-200"
                            iconClassName="bg-green-100 text-green-600"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Recently Clocked Section */}
                {filteredOptions.filter(opt => opt.section === 'recent').length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <History className="h-4 w-4" />
                      🔄 Recently Clocked
                    </div>
                    <div className="space-y-2">
                      {filteredOptions
                        .filter(opt => opt.section === 'recent')
                        .map((option) => (
                          <WorkItemCard
                            key={`${option.type}_${option.id}`}
                            option={option}
                            isSelected={selectedOption?.id === option.id && selectedOption?.type === option.type}
                            onSelect={setSelectedOption}
                            iconClassName="bg-blue-100 text-blue-600"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* All Available Section */}
                {filteredOptions.filter(opt => opt.section === 'available').length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Folder className="h-4 w-4" />
                      📂 All Available
                    </div>
                    <div className="space-y-2 opacity-90">
                      {filteredOptions
                        .filter(opt => opt.section === 'available')
                        .map((option) => (
                          <WorkItemCard
                            key={`${option.type}_${option.id}`}
                            option={option}
                            isSelected={selectedOption?.id === option.id && selectedOption?.type === option.type}
                            onSelect={setSelectedOption}
                            iconClassName="bg-muted text-muted-foreground"
                          />
                        ))}
                    </div>
                  </div>
                )}

                {filteredOptions.length === 0 && (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground">
                      {searchQuery ? 'No matching work found' : 'No work available'}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSheetOpen(false);
                setSelectedOption(null);
                setSearchQuery('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleClockAction}
              disabled={isClockingIn || isClockingOut || (!clockData.isClocked && !selectedOption)}
              className="flex-1"
            >
              {isClockingIn || isClockingOut ? (
                <Clock className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {clockData.isClocked ? 'Clock Out' : 'Clock In'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default FloatingClockWidget;