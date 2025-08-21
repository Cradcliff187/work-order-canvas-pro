import { Play } from 'lucide-react';
import { ClockFABProps } from './types';

export function ClockFAB({ isClocked, elapsedTime, onFabClick, formatElapsedTime }: ClockFABProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onFabClick}
        className={`
          relative overflow-hidden rounded-full p-4 shadow-lg transition-all duration-300 
          transform hover:scale-105 active:scale-95 min-w-[64px] min-h-[64px]
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
            <div className="text-center">
              <div className="text-sm font-medium leading-tight">
                {formatElapsedTime(elapsedTime)}
              </div>
            </div>
          ) : (
            <Play size={24} className="fill-current" />
          )}
        </div>
      </button>
    </div>
  );
}