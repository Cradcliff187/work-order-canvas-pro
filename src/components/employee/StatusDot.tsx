import React from 'react';
import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: 'active' | 'pending' | 'in_progress' | 'available';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusDot: React.FC<StatusDotProps> = ({ 
  status, 
  className,
  size = 'sm' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-green-500',
          animation: 'animate-pulse',
          label: 'Active'
        };
      case 'in_progress':
        return {
          color: 'bg-blue-500', 
          animation: 'animate-pulse',
          label: 'In Progress'
        };
      case 'pending':
        return {
          color: 'bg-yellow-500',
          animation: '',
          label: 'Pending'
        };
      case 'available':
      default:
        return {
          color: 'bg-gray-400',
          animation: '',
          label: 'Available'
        };
    }
  };

  const config = getStatusConfig();
  const sizeClass = size === 'md' ? 'h-3 w-3' : 'h-2 w-2';

  return (
    <div 
      className={cn(
        'rounded-full border-2 border-white shadow-sm',
        sizeClass,
        config.color,
        config.animation,
        className
      )}
      title={config.label}
      aria-label={config.label}
    />
  );
};