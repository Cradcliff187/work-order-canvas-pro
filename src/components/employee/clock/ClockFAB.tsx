import { Play } from 'lucide-react';
import { ClockFABProps } from './types';
import { ElapsedTimeDisplay } from './ElapsedTimeDisplay';

export function ClockFAB({ isClocked, elapsedTime, onFabClick }: Omit<ClockFABProps, 'formatElapsedTime'>) {
  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[60]">
      <button
        onClick={onFabClick}
        className={`
          relative overflow-hidden rounded-full p-4 shadow-lg transition-colors duration-300 
          transform hover:scale-105 min-w-[64px] min-h-[64px]
          ${isClocked 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/25' 
            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/25'
          }
        `}
        aria-label={isClocked ? 'View clock status' : 'Clock in'}
      >
        {/* Animated background gradient */}
        <div 
          className={`
            absolute inset-0 opacity-50 rounded-full transition-all duration-1000
            ${isClocked 
              ? 'bg-gradient-to-r from-emerald-400 to-green-400 animate-pulse' 
              : 'bg-gradient-to-r from-indigo-400 to-blue-400'
            }
          `}
        />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center">
          {isClocked ? (
            <ElapsedTimeDisplay 
              timeMs={elapsedTime} 
              format="detailed" 
              variant="fab" 
            />
          ) : (
            <Play size={24} className="fill-current" />
          )}
        </div>
      </button>
    </div>
  );
}