import React from 'react';
import { User } from 'lucide-react';
import { format } from 'date-fns';

interface SlimHeaderProps {
  firstName?: string;
  isMobile?: boolean;
}

export function SlimHeader({ firstName, isMobile = false }: SlimHeaderProps) {
  if (isMobile) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 rounded-full p-1">
            <User className="h-3 w-3 text-primary" />
          </div>
          <div>
            <h1 className="text-xs font-semibold">
              Welcome back, {firstName || 'Employee'}!
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <h1 className="text-lg font-semibold">
        Welcome back, {firstName || 'Employee'} • {format(new Date(), 'EEEE, MMMM d')}
      </h1>
    </div>
  );
}