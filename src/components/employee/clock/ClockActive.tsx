import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useClockState } from '@/hooks/useClockState';
import { useClockTimer } from '@/hooks/useClockTimer';

interface ClockActiveProps {
  onClockOut: () => void;
  isClockingOut: boolean;
}

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

export const ClockActive: React.FC<ClockActiveProps> = ({
  onClockOut,
  isClockingOut
}) => {
  const { clockInTime, workOrderId, locationAddress, hourlyRate } = useClockState();
  const { elapsedTime, formatElapsedTimeDetailed } = useClockTimer();

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
                {formatElapsedTimeDetailed(elapsedTime)}
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