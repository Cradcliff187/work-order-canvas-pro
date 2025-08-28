import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableContainer({ 
  children, 
  className 
}: ResponsiveTableContainerProps) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-md border", className)}>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        <div className="inline-block min-w-full align-middle">
          {children}
        </div>
      </div>
    </div>
  );
}