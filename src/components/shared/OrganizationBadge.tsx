import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Briefcase, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Organization {
  name: string;
  organization_type?: string;
}

interface OrganizationBadgeProps {
  organization: Organization;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  showType?: boolean;
  className?: string;
}

// Color scheme: partner=blue, subcontractor=green, internal=purple
const getOrganizationStyles = (type?: string) => {
  switch (type) {
    case 'partner':
      return {
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
        icon: Building2,
      };
    case 'subcontractor':
      return {
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
        icon: Users,
      };
    case 'internal':
      return {
        className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700',
        icon: Briefcase,
      };
    default:
      return {
        className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        icon: Building2,
      };
  }
};

export function OrganizationBadge({ 
  organization, 
  size = 'default',
  showIcon = true,
  showType = false,
  className 
}: OrganizationBadgeProps) {
  const { className: typeClassName, icon: Icon } = getOrganizationStyles(organization.organization_type);
  
  const displayText = showType && organization.organization_type 
    ? `${organization.name} (${organization.organization_type})`
    : organization.name;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              typeClassName, 
              size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-0.5',
              'cursor-help',
              className
            )}
          >
            <div className="flex items-center gap-1">
              {showIcon && <Icon className={cn('flex-shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
              <span className="truncate max-w-24 sm:max-w-32">{displayText}</span>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">{organization.name}</div>
            {organization.organization_type && (
              <div className="text-muted-foreground capitalize">
                {organization.organization_type} Organization
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getOrganizationTypeColor(type?: string): string {
  return getOrganizationStyles(type).className;
}