import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Play, DollarSign, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useClockState } from '@/hooks/useClockState';
import { useRecentlyClocked } from '@/hooks/useRecentlyClocked';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { WorkItemClockCard } from '@/components/employee/WorkItemClockCard';

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
  const { data: recentItems = [], isLoading: isLoadingRecent } = useRecentlyClocked();
  const { openClockWidget } = useClockWidget();

  const handleQuickClockIn = (workOrderId?: string, projectId?: string) => {
    clockIn.mutate({ workOrderId, projectId });
  };

  if (!isClocked) {
    return (
      <>
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Select Work to Begin</h2>
            <p className="text-muted-foreground">Tap any item to clock in instantly</p>
          </div>

          {isLoadingRecent ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-20"></div>
                      <div className="h-5 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentItems.map((item) => (
                <WorkItemClockCard
                  key={`${item.type}_${item.id}`}
                  item={item}
                  onClockIn={handleQuickClockIn}
                  isLoading={isClockingIn}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-muted/30 border-dashed border-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-full p-6 w-fit mx-auto mb-6 animate-bounce-in">
                  <Search className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Ready to Start Working?
                </h3>
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-md mx-auto">
                  Find work orders and projects to begin tracking your time and productivity
                </p>
                <div className="space-y-4">
                  <Button 
                    onClick={openClockWidget}
                    size="lg"
                    className="shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-8 py-4 h-auto hover:scale-105"
                  >
                    <Search className="h-6 w-6 mr-3" />
                    Find Work Items
                  </Button>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <span>Search by number</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      <span>Browse by type</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                      <span>View recent work</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-success/20 via-success/15 to-emerald-500/15 border-success/50 shadow-2xl hover:shadow-[0_25px_50px_-12px_hsl(var(--success)/0.25)] transition-all duration-500 ring-2 ring-success/30 animate-fade-in max-w-full">
      <CardContent className="p-4 sm:p-6 md:p-8 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-emerald-500/5 animate-pulse" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-success/40 to-success/20 rounded-full p-3 sm:p-5 shadow-lg flex-shrink-0">
              <Clock className="h-6 w-6 sm:h-10 sm:w-10 text-success animate-pulse drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Currently Clocked In</h3>
                <Badge variant="outline" className="border-success text-success bg-success/20 px-3 py-1 animate-pulse w-fit">
                  Active
                </Badge>
              </div>
              
              {/* Enhanced Large Timer Display */}
              <div className="mb-4 sm:mb-6">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-success mb-3 animate-pulse tabular-nums tracking-tight break-all">
                  {formatElapsedTime(elapsedTime)}
                </div>
                
                {/* Enhanced Live Earnings Counter */}
                {hourlyRate && (
                  <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-xl font-bold bg-gradient-to-r from-success/20 to-emerald-500/20 rounded-lg p-2 sm:p-3 border border-success/30">
                    <div className="bg-success/20 rounded-full p-1 sm:p-2 flex-shrink-0">
                      <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-success" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg sm:text-xl md:text-2xl font-bold text-success tabular-nums truncate">
                        {calculateEarnings(elapsedTime, hourlyRate)}
                      </span>
                      <span className="text-xs sm:text-sm text-success/70">earned so far</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Task Display */}
              <p className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-2 sm:mb-3 truncate">
                {workOrderId ? 
                  `Work Order: ${workOrderId}` :
                  'General Time'
                }
              </p>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <span className="truncate">
                  Started: {clockInTime ? 
                    format(new Date(clockInTime), 'h:mm a') : 
                    '--'
                  }
                </span>
              </div>
              
              {locationAddress && (
                <div className="flex items-center gap-2 mt-2 sm:mt-3 min-w-0">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">
                    {locationAddress}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button 
            variant="destructive"
            onClick={onClockOut}
            disabled={isClockingOut}
            size="lg"
            className="h-12 sm:h-14 px-4 sm:px-8 text-sm sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto flex-shrink-0"
          >
            {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};