
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAccessibleWorkOrders } from '@/hooks/useUserAccessibleWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { UnreadMessagesDropdown } from './UnreadMessagesDropdown';

export function UserDropdown() {
  const { profile, signOut } = useAuth();
  const [showUnreadDropdown, setShowUnreadDropdown] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get accessible work orders and unread counts
  const { data: workOrderIds = [] } = useUserAccessibleWorkOrders();
  const { data: unreadCounts = {} } = useUnreadMessageCounts(workOrderIds);

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleMouseEnter = () => {
    if (totalUnread > 0) {
      const timeout = setTimeout(() => {
        setShowUnreadDropdown(true);
      }, 500);
      setHoverTimeout(timeout);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Don't immediately hide - let the dropdown handle its own hover state
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const userInitials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {totalUnread > 0 && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full border border-background">
                  <span className="sr-only">{totalUnread} unread messages</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-start text-xs">
              <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
              <span className="text-muted-foreground capitalize">{profile?.user_type}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
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

    <UnreadMessagesDropdown
      isVisible={showUnreadDropdown}
      unreadCounts={unreadCounts}
      onClose={() => setShowUnreadDropdown(false)}
    />
  </div>
  );
}
