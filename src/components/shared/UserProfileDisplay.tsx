import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  avatar_url?: string | null;
  company_name?: string | null;
}

interface UserProfileDisplayProps {
  profile: Profile | null;
  showAvatar?: boolean;
  showUserType?: boolean;
  showCompany?: boolean;
  layout?: 'horizontal' | 'vertical';
  avatarSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserProfileDisplay({
  profile,
  showAvatar = true,
  showUserType = true,
  showCompany = false,
  layout = 'horizontal',
  avatarSize = 'md',
  className
}: UserProfileDisplayProps) {
  if (!profile) {
    return null;
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

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
        
        {showUserType && (
          <p className="text-xs text-muted-foreground capitalize">
            {profile.user_type}
          </p>
        )}
        
        {showCompany && profile.company_name && (
          <p className="text-xs text-muted-foreground truncate">
            {profile.company_name}
          </p>
        )}
      </div>
    </div>
  );
}