import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Play } from 'lucide-react';
import { format } from 'date-fns';
import { useClockState } from '@/hooks/useClockState';
import { FloatingClockWidget } from '@/components/employee/FloatingClockWidget';

interface ClockStatusCardProps {
  onClockOut: () => void;
  isClockingOut: boolean;
}

export const ClockStatusCard: React.FC<ClockStatusCardProps> = ({
  onClockOut,
  isClockingOut
}) => {
  const { isClocked, clockInTime, workOrderId, locationAddress, elapsedTime } = useClockState();
  const [showClockWidget, setShowClockWidget] = React.useState(false);

  if (!isClocked) {
    return (
      <>
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 rounded-full p-3">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ready to Clock In</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a work item to start tracking time
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowClockWidget(true)} size="lg">
                <Play className="h-4 w-4 mr-2" />
                Clock In
              </Button>
            </div>
          </CardContent>
        </Card>
        {showClockWidget && <FloatingClockWidget />}
      </>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-success/10 to-success/20 border-success/30">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-success/20 rounded-full p-3">
              <Clock className="h-6 w-6 text-success animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">Currently Clocked In</h3>
                <Badge variant="outline" className="border-success text-success">
                  Active
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">
                {workOrderId ? 
                  `Work Order: ${workOrderId}` :
                  'General Time'
                }
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>
                  Started: {clockInTime ? 
                    format(new Date(clockInTime), 'h:mm a') : 
                    '--'
                  }
                </span>
                {elapsedTime && (
                  <span className="font-mono text-success font-medium">
                    {elapsedTime}
                  </span>
                )}
              </div>
              {locationAddress && (
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
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
          >
            {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};