import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus } from 'lucide-react';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { useRecentlyClockedWorkOrders } from '@/hooks/useRecentlyClockedWorkOrders';
import { useWorkItemSearch } from '@/hooks/useWorkItemSearch';
import { formatElapsedTime as formatTimeUtil } from '@/utils/timeFormatters';
import { ClockSelector } from './ClockSelector';
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

  // Filter to get recent work orders (not projects) for horizontal scroll
  const recentWorkOrders = allWorkItems
    .filter(item => item.type === 'work_order')
    .slice(0, 3);

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

          {/* Quick Select Chips */}
          {recentlyClockedWorkOrders.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Start</h4>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {recentlyClockedWorkOrders.map((workOrder) => (
                  <Badge
                    key={workOrder.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 px-3 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0"
                    onClick={() => clockIn.mutate({ workOrderId: workOrder.id })}
                  >
                    {workOrder.work_order_number}
                  </Badge>
                ))}
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent/80 transition-all duration-200 px-3 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0"
                  onClick={openClockWidget}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Browse
                </Badge>
              </div>
            </div>
          )}

          {/* Recent Work Orders Horizontal Scroll */}
          {recentWorkOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Work Orders</h4>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {recentWorkOrders.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-64">
                    <Card 
                      className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-blue-500 bg-gradient-to-br from-background to-muted/30 hover:from-primary/5 hover:to-primary/5"
                      onClick={() => handleQuickClockIn(item.id, undefined)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">WO</Badge>
                          {item.assigneeName && (
                            <Badge variant="secondary" className="text-xs truncate">
                              {item.assigneeName}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-xs text-muted-foreground">
                            WO-{item.number}
                          </div>
                          <h4 className="font-bold text-sm leading-tight line-clamp-2">
                            {item.title}
                          </h4>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
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