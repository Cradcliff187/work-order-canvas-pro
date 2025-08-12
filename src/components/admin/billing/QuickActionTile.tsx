import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickActionTileProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  ariaLabel?: string;
}

export function QuickActionTile({ label, icon: Icon, onClick, ariaLabel }: QuickActionTileProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || label}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="card-hover cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="p-4 md:p-6 h-24 flex items-center justify-center gap-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </CardContent>
    </Card>
  );
}
