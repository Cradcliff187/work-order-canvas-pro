import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  organization_type: 'partner' | 'subcontractor' | 'internal';
  initials?: string;
}

interface OrganizationBadgeProps {
  organization: Organization | null | undefined;
  showIcon?: boolean;
  showName?: boolean;
  showType?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OrganizationBadge({
  organization,
  showIcon = true,
  showName = true,
  showType = false,
  size = 'md',
  className
}: OrganizationBadgeProps) {
  if (!organization) {
    return null;
  }

  // Get badge variant based on organization type
  const getVariant = () => {
    switch (organization.organization_type) {
      case 'internal':
        return 'default';
      case 'partner':
        return 'secondary';
      case 'subcontractor':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get icon based on organization type
  const getIcon = () => {
    const iconClass = cn(
      size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'
    );
    
    switch (organization.organization_type) {
      case 'internal':
        return <Home className={iconClass} />;
      case 'partner':
        return <Building2 className={iconClass} />;
      case 'subcontractor':
        return <Wrench className={iconClass} />;
      default:
        return <Building2 className={iconClass} />;
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-5 text-[10px] px-1.5 gap-1',
    md: 'h-6 text-xs px-2 gap-1.5',
    lg: 'h-7 text-sm px-2.5 gap-2'
  };

  // Determine display text
  const displayText = () => {
    if (showName && showType) {
      return `${organization.name} (${organization.organization_type})`;
    }
    if (showName) {
      return organization.name;
    }
    if (showType) {
      return organization.organization_type;
    }
    return organization.initials || organization.name.slice(0, 3).toUpperCase();
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        sizeClasses[size],
        'inline-flex items-center font-medium',
        className
      )}
    >
      {showIcon && getIcon()}
      <span className="truncate max-w-[200px]">
        {displayText()}
      </span>
    </Badge>
  );
}