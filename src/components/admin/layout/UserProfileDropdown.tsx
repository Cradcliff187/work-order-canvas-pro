import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useIsMobile } from '@/hooks/use-mobile';

interface UserProfileDropdownProps {
  collapsed?: boolean;
}

export function UserProfileDropdown({ collapsed = false }: UserProfileDropdownProps) {
  const { profile, signOut } = useAuth();
  const { primaryRole, isEmployee, isAdmin } = useUserProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Unread counts for the separate messages button
  const { data: unreadCounts = {} } = useUnreadMessageCounts([], profile, isEmployee, isAdmin);
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleProfileClick = () => {
    // Navigate to appropriate profile page based on current route
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/partner')) {
      navigate('/partner/profile');
    } else if (currentPath.startsWith('/subcontractor')) {
      navigate('/subcontractor/profile');
    } else {
      navigate('/admin/profile');
    }
  };

  const userInitials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`;

  if (collapsed) {
    return (
      <div className="flex flex-col gap-2">
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full p-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
            <DropdownMenuItem onClick={handleProfileClick}>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separate Messages Button */}
        {totalUnread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full p-2 relative"
            onClick={() => navigate('/messages')}
            aria-label="Open messages"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 text-[10px] leading-none rounded-full px-1 bg-destructive text-destructive-foreground border border-background">
              {totalUnread}
            </span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="justify-start gap-2 h-auto p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-xs">
              <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
              <span className="text-muted-foreground capitalize">{primaryRole}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
          <DropdownMenuItem onClick={handleProfileClick}>
            <Settings className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Separate Messages Button */}
      {totalUnread > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/messages')}
          aria-label="Open messages"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 text-[10px] leading-none rounded-full px-1 bg-destructive text-destructive-foreground border border-background">
            {totalUnread}
          </span>
        </Button>
      )}
    </div>
  );
}