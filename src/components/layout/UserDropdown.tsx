
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, User, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { useNavigate } from 'react-router-dom';

export function UserDropdown() {
  const { profile, signOut } = useAuth();
  const { primaryRole, isEmployee, isAdmin } = useUserProfile();
  const navigate = useNavigate();

  // Unread counts (no need to fetch work order IDs)
  const { data: unreadCounts = {} } = useUnreadMessageCounts([], profile, isEmployee, isAdmin);

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleMessagesClick = () => {
    navigate('/messages');
  };

  const handleProfileClick = () => {
    navigate('/partner/profile');
  };

  const handleSettingsClick = () => {
    navigate('/partner/profile');
  };

  const userInitials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`;

  return (
    <div className="relative flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 relative pointer-events-auto"
          >
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleProfileClick}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {totalUnread > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="relative pointer-events-auto touch-manipulation min-h-[44px] min-w-[44px]"
          onClick={handleMessagesClick}
          aria-label="Open messages"
          type="button"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="sr-only">View unread messages</span>
          <span className="absolute -top-1 -right-1 text-[10px] leading-none rounded-full px-1 bg-destructive text-destructive-foreground border border-background min-w-[16px] h-4 flex items-center justify-center">
            {totalUnread}
          </span>
        </Button>
      )}
    </div>
  );
}
