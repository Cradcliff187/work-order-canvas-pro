import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Play, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useTodayHours } from '@/hooks/useTodayHours';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { WorkItemClockCard } from '@/components/employee/WorkItemClockCard';
import { formatElapsedTime as formatTimeUtil } from '@/lib/utils/time';

interface ClockStatusCardProps {
  onClockOut: () => void;
  isClockingOut: boolean;
}

// Helper function to format elapsed time
const formatElapsedTime = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper function to calculate current earnings
const calculateEarnings = (elapsedTime: number, hourlyRate: number): string => {
  const hoursWorked = elapsedTime / (1000 * 60 * 60);
  const earnings = hoursWorked * hourlyRate;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(earnings);
};

export const ClockStatusCard: React.FC<ClockStatusCardProps> = ({
  onClockOut,
  isClockingOut
}) => {
  const { isClocked, clockInTime, workOrderId, locationAddress, elapsedTime, hourlyRate, clockIn, isClockingIn } = useClockState();
  const { data: allWorkItems = [], isLoading: isLoadingWorkItems } = useAllWorkItems();
  const { data: todayHours = 0 } = useTodayHours();
  const isMobile = useIsMobile();
  const { openClockWidget } = useClockWidget();

  // Filter to get recent work orders (not projects) for horizontal scroll
  const recentWorkOrders = allWorkItems
    .filter(item => item.type === 'work_order')
    .slice(0, 3);

  const handleQuickClockIn = (workOrderId?: string, projectId?: string) => {
    clockIn.mutate({ workOrderId, projectId });
  };

  if (!isClocked) {
    return (
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
              onClick={openClockWidget}
              size="lg"
              className={`shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4 ${
                isMobile ? 'w-full h-14' : 'h-auto hover:scale-105'
              }`}
            >
              <Play className="h-6 w-6 mr-3" />
              Start Work
            </Button>
          </div>

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
    );
  }

  return (
    <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/30 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-success/20 rounded-full p-3 flex-shrink-0">
              <Clock className="h-8 w-8 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold">Clocked In</h3>
                <Badge variant="outline" className="border-success text-success bg-success/10">
                  Active
                </Badge>
              </div>
              
              {/* Timer Display */}
              <div className="text-2xl sm:text-3xl font-mono font-bold text-success mb-2 tabular-nums">
                {formatElapsedTime(elapsedTime)}
              </div>
              
              {/* Earnings */}
              {hourlyRate && (
                <div className="flex items-center gap-2 text-sm font-semibold bg-success/10 rounded-lg p-2 mb-2">
                  <DollarSign className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-success tabular-nums">
                    {calculateEarnings(elapsedTime, hourlyRate)} earned
                  </span>
                </div>
              )}

              {/* Work Order and Start Time */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium truncate">
                  {workOrderId ? `Work Order: ${workOrderId}` : 'General Time'}
                </p>
                <p className="truncate">
                  Started: {clockInTime ? format(new Date(clockInTime), 'h:mm a') : '--'}
                </p>
                {locationAddress && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{locationAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Prominent Clock Out Button */}
          <Button 
            variant="destructive"
            onClick={onClockOut}
            disabled={isClockingOut}
            size="lg"
            className="h-12 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
          >
            {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};