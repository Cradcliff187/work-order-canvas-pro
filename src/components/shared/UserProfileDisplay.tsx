import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  organization_memberships?: Array<{
    organization: {
      name: string;
      organization_type: 'internal' | 'partner' | 'subcontractor';
    };
    role: string;
  }>;
}

interface UserProfileDisplayProps {
  profile: Profile | null;
  showAvatar?: boolean;
  showRole?: boolean;
  showOrganization?: boolean;
  layout?: 'horizontal' | 'vertical';
  avatarSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserProfileDisplay({
  profile,
  showAvatar = true,
  showRole = true,
  showOrganization = false,
  layout = 'horizontal',
  avatarSize = 'md',
  className
}: UserProfileDisplayProps) {
  if (!profile) {
    return null;
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  
  // Get primary organization data
  const primaryOrg = profile.organization_memberships?.[0];
  const organizationName = primaryOrg?.organization?.name;
  const organizationRole = primaryOrg?.role;

  const avatarSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base'
  };

  const layoutClasses = {
    horizontal: 'flex items-center gap-3',
    vertical: 'flex flex-col items-center gap-2 text-center'
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {showAvatar && (
        <Avatar className={avatarSizes[avatarSize]}>
          <AvatarImage src={profile.avatar_url || undefined} alt={fullName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        'min-w-0 flex-1',
        layout === 'vertical' ? 'text-center' : ''
      )}>
        <p className={cn(
          'font-medium truncate',
          textSizes[avatarSize]
        )}>
          {fullName}
        </p>
        
        {showRole && organizationRole && (
          <p className="text-xs text-muted-foreground capitalize">
            {organizationRole}
          </p>
        )}
        
        {showOrganization && organizationName && (
          <p className="text-xs text-muted-foreground truncate">
            {organizationName}
          </p>
        )}
      </div>
    </div>
  );
}