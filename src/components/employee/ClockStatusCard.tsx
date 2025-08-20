import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Play, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useClockState } from '@/hooks/useClockState';
import { FloatingClockWidget } from '@/components/employee/FloatingClockWidget';

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
  const { isClocked, clockInTime, workOrderId, locationAddress, elapsedTime, hourlyRate } = useClockState();
  const [showClockWidget, setShowClockWidget] = React.useState(false);

  if (!isClocked) {
    return (
      <>
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-8 sm:p-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-gradient-to-br from-primary/30 to-primary/10 rounded-full p-4">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Ready to Clock In</h3>
                  <p className="text-base text-muted-foreground">
                    Select a work item to start tracking time
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowClockWidget(true)} 
                size="lg"
                className="h-14 px-8 text-lg font-semibold animate-pulse hover:animate-none transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Play className="h-6 w-6 mr-3" />
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
    <Card className="bg-gradient-to-br from-success/15 via-success/10 to-emerald-500/10 border-success/40 shadow-xl hover:shadow-2xl transition-all duration-300 ring-1 ring-success/20">
      <CardContent className="p-8 sm:p-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-success/30 to-success/10 rounded-full p-4">
              <Clock className="h-8 w-8 text-success animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-2xl font-bold">Currently Clocked In</h3>
                <Badge variant="outline" className="border-success text-success bg-success/10 px-3 py-1">
                  Active
                </Badge>
              </div>
              
              {/* Large Timer Display */}
              <div className="mb-4">
                <div className="text-4xl font-mono font-bold text-success mb-2">
                  {formatElapsedTime(elapsedTime)}
                </div>
                
                {/* Live Earnings Counter */}
                {hourlyRate && (
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <DollarSign className="h-5 w-5" />
                    <span>{calculateEarnings(elapsedTime, hourlyRate)} earned</span>
                  </div>
                )}
              </div>

              {/* Current Task Display */}
              <p className="text-lg font-semibold text-foreground mb-3">
                {workOrderId ? 
                  `Work Order: ${workOrderId}` :
                  'General Time'
                }
              </p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Started: {clockInTime ? 
                    format(new Date(clockInTime), 'h:mm a') : 
                    '--'
                  }
                </span>
              </div>
              
              {locationAddress && (
                <div className="flex items-center gap-2 mt-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">
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
            className="h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};