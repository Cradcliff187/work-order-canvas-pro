import { useState } from 'react';
import { Play } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { ClockFABProps } from '../clock/types';
import { cn } from '@/lib/utils';

export function MobileClockFAB({ 
  isClocked, 
  elapsedTime, 
  onFabClick, 
  formatElapsedTime 
}: ClockFABProps) {
  const [isPressed, setIsPressed] = useState(false);
  const { onFieldSave, onSubmitSuccess } = useHapticFeedback();

  const handleTouchStart = () => {
    setIsPressed(true);
    onFieldSave(); // Light haptic feedback on touch
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    onSubmitSuccess(); // Medium haptic feedback on action
    onFabClick();
  };

  return (
    <div className="fixed bottom-20 right-4 z-[60]">
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className={cn(
          // Base styles - mobile optimized
          "relative overflow-hidden rounded-full shadow-lg",
          "min-w-[48px] min-h-[48px] w-16 h-16",
          "touch-manipulation select-none",
          "transition-transform duration-150 ease-out",
          
          // Press states
          isPressed ? "scale-95" : "scale-100",
          
          // Color variants
          isClocked 
            ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30" 
            : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30",
          
          // Text color
          "text-white"
        )}
        style={{
          willChange: 'transform',
          WebkitTapHighlightColor: 'transparent'
        }}
        aria-label={isClocked ? 'View clock status' : 'Clock in'}
      >
        {/* Simplified background pulse for active state */}
        {isClocked && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full opacity-20",
              "bg-gradient-to-br from-white to-transparent",
              "animate-pulse"
            )}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          {isClocked ? (
            <div className="text-center px-1">
              <div className="text-xs font-semibold leading-tight whitespace-nowrap">
                {formatElapsedTime(elapsedTime)}
              </div>
            </div>
          ) : (
            <Play size={20} className="fill-current ml-0.5" />
          )}
        </div>
      </button>
    </div>
  );
}