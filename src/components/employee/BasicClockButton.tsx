import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2 } from 'lucide-react';
import { useClockState } from '@/hooks/useClockState';
import { cn } from '@/lib/utils';

interface BasicClockButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

// Format elapsed time from milliseconds to "Xh Ym" format
const formatElapsedTime = (milliseconds: number): string => {
  if (milliseconds < 60000) return '< 1m'; // Less than 1 minute
  
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export function BasicClockButton({ onClick, loading = false, className }: BasicClockButtonProps) {
  const { isClocked, elapsedTime } = useClockState();

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        onClick={onClick}
        disabled={loading}
        variant={isClocked ? "success" : "secondary"}
        className={cn(
          "w-full h-15 text-lg font-semibold shadow-lg transition-all duration-200",
          "hover:shadow-xl hover:-translate-y-0.5",
          "active:scale-[0.98] disabled:opacity-50",
          isClocked && "bg-success hover:bg-success/90",
          !isClocked && "bg-secondary hover:bg-secondary/80"
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isClocked ? 'Clock Out' : 'Clock In'}
          </div>
        )}
      </Button>
      
      {isClocked && elapsedTime > 0 && (
        <div className="flex justify-center">
          <Badge 
            variant="outline" 
            className="text-sm font-medium px-3 py-1 bg-background/80 backdrop-blur-sm"
          >
            {formatElapsedTime(elapsedTime)}
          </Badge>
        </div>
      )}
    </div>
  );
}