import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { useRecentlyClockedWorkOrders } from '@/hooks/useRecentlyClockedWorkOrders';
import { useWorkItemSearch } from '@/hooks/useWorkItemSearch';
import { formatElapsedTime as formatTimeUtil } from '@/utils/timeFormatters';
import { filterRecentWorkOrders } from '@/utils/workItemFilters';
import { ClockSelector } from './ClockSelector';
import { QuickStartSection } from './QuickStartSection';
import type { ClockOption } from './types';

export const ClockInactive: React.FC = () => {
  const { clockIn, isClockingIn } = useClockState();
  const { data: allWorkItems = [] } = useAllWorkItems();
  const { data: todayHours = 0 } = useTodayHours();
  const { data: recentlyClockedWorkOrders = [] } = useRecentlyClockedWorkOrders();
  const isMobile = useIsMobile();
  const { openClockWidget } = useClockWidget();
  
  // Use work item search hook for consistent data handling
  const { filteredOptions } = useWorkItemSearch();

  // Sheet state
  const [showSelector, setShowSelector] = useState(false);

  // Get recent work orders (not projects) for horizontal scroll
  const recentWorkOrders = filterRecentWorkOrders(allWorkItems, 3);

  const handleQuickClockIn = (workOrderId?: string, projectId?: string) => {
    clockIn.mutate({ workOrderId, projectId });
  };

  const handleSelectorClockIn = (option: ClockOption) => {
    if (option.type === 'work_order') {
      clockIn.mutate({ workOrderId: option.id });
    } else {
      clockIn.mutate({ projectId: option.id });
    }
    setShowSelector(false);
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-muted/30 border-dashed border-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardContent className="p-6 relative">
          {/* Today's Hours Display - Top Right */}
          <div className="absolute top-4 right-4 text-right">
            <div className="text-sm text-muted-foreground">Today</div>
            <div className="text-lg font-bold text-primary">
              {formatTimeUtil(todayHours * 60 * 60 * 1000)}
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-full p-6 w-fit mx-auto mb-4">
              <Play className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Ready to Start Working?
            </h3>
            <p className="text-muted-foreground mb-6 text-base leading-relaxed max-w-md mx-auto">
              Select work or find new assignments to begin tracking your time
            </p>
            
            {/* Start Work Button */}
            <Button 
              onClick={() => setShowSelector(true)}
              size="lg"
              className={`shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4 ${
                isMobile ? 'w-full h-14' : 'h-auto hover:scale-105'
              }`}
            >
              <Play className="h-6 w-6 mr-3" />
              Start Work
            </Button>
          </div>

          <QuickStartSection
            recentlyClockedWorkOrders={recentlyClockedWorkOrders}
            recentWorkOrders={recentWorkOrders}
            onQuickClockIn={(workOrderId) => clockIn.mutate({ workOrderId })}
            onBrowseClick={openClockWidget}
          />
        </CardContent>
      </Card>

      <ClockSelector
        isOpen={showSelector}
        onOpenChange={setShowSelector}
        options={filteredOptions}
        isLoading={isClockingIn}
        onClockIn={handleSelectorClockIn}
      />
    </>
  );
};