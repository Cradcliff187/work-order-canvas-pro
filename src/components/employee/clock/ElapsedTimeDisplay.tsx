import React from 'react';
import { Clock } from 'lucide-react';
import { 
  formatElapsedTime, 
  formatElapsedTimeDetailed, 
  formatElapsedTimeMinutes 
} from '@/utils/timeFormatters';
import { cn } from '@/lib/utils';

interface ElapsedTimeDisplayProps {
  timeMs: number;
  format: 'compact' | 'detailed' | 'minutes';
  variant?: 'default' | 'large' | 'badge' | 'fab';
  className?: string;
  showIcon?: boolean;
}

const variantClasses = {
  default: "text-sm font-medium tabular-nums",
  large: "text-2xl sm:text-3xl font-mono font-bold tabular-nums text-success",
  badge: "text-xs font-semibold tabular-nums",
  fab: "text-sm font-medium leading-tight tabular-nums sm:text-base"
};

/**
 * Centralized component for displaying elapsed time with consistent formatting and styling
 */
export function ElapsedTimeDisplay({
  timeMs,
  format,
  variant = 'default',
  className,
  showIcon = false
}: ElapsedTimeDisplayProps) {
  const formatTime = React.useMemo(() => {
    switch (format) {
      case 'compact':
        return formatElapsedTime(timeMs);
      case 'detailed':
        return formatElapsedTimeDetailed(timeMs);
      case 'minutes':
        return formatElapsedTimeMinutes(timeMs);
      default:
        return formatElapsedTime(timeMs);
    }
  }, [timeMs, format]);

  const baseClasses = variantClasses[variant];
  
  // Generate accessible time announcement for screen readers
  const accessibleTime = React.useMemo(() => {
    const hours = Math.floor(timeMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeMs % (1000 * 60)) / 1000);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : '0 seconds';
  }, [timeMs]);

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5",
        baseClasses,
        className
      )}
      aria-label={`Elapsed time: ${accessibleTime}`}
    >
      {showIcon && (
        <Clock 
          className={cn(
            "flex-shrink-0",
            variant === 'large' ? "h-5 w-5" : 
            variant === 'badge' ? "h-2.5 w-2.5" :
            variant === 'fab' ? "h-3 w-3 sm:h-3.5 sm:w-3.5" :
            "h-3.5 w-3.5"
          )}
        />
      )}
      <span className="min-w-0">
        {formatTime}
      </span>
    </div>
  );
}