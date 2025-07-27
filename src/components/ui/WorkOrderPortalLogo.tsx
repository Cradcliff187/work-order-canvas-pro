import React from 'react';

interface WorkOrderPortalLogoProps {
  size?: 'sm' | 'md';
  iconOnly?: boolean;
  className?: string;
}

export function WorkOrderPortalLogo({ 
  size = 'md', 
  iconOnly = false, 
  className = '' 
}: WorkOrderPortalLogoProps) {
  const height = size === 'sm' ? 24 : 32;
  const width = iconOnly ? height : height * 3.5;

  if (iconOnly) {
    // Icon-only version - just the "WOP" letters in a circle
    return (
      <svg
        width={height}
        height={height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1"
        />
        <text
          x="20"
          y="26"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="hsl(var(--primary-foreground))"
          fontFamily="system-ui, sans-serif"
        >
          WOP
        </text>
      </svg>
    );
  }

  // Full logo version with icon + text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={height}
        height={height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1"
        />
        <text
          x="20"
          y="26"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="hsl(var(--primary-foreground))"
          fontFamily="system-ui, sans-serif"
        >
          WOP
        </text>
      </svg>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-sidebar-foreground">
          WorkOrderPortal
        </span>
      </div>
    </div>
  );
}