
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserProfileDisplay } from '@/components/shared/UserProfileDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { Building2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardHeaderProps {
  showUserInfo?: boolean;
  showSignOut?: boolean;
  variant?: 'subcontractor' | 'partner';
  className?: string;
}

export function StandardHeader({ 
  showUserInfo = true, 
  showSignOut = true, 
  variant = 'subcontractor',
  className 
}: StandardHeaderProps) {
  const { signOut, profile } = useAuth();
  const { data: userOrganizations } = useUserOrganizations();
  const primaryOrg = userOrganizations?.[0];

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="-ml-1" />
          
          {primaryOrg && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{primaryOrg.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{primaryOrg.organization_type}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {showUserInfo && profile && (
            <div className="hidden sm:block">
              <UserProfileDisplay
                profile={profile}
                showAvatar={false}
                showUserType={false}
                showCompany={!!profile.company_name}
                layout="vertical"
                avatarSize="sm"
                className="text-right"
              />
            </div>
          )}
          
          {showSignOut && (
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
