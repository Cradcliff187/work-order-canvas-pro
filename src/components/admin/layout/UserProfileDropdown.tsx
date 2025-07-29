import React, { useState, useEffect } from 'react';
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
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAccessibleWorkOrders } from '@/hooks/useUserAccessibleWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { UnreadMessagesDropdown } from '@/components/layout/UnreadMessagesDropdown';

interface UserProfileDropdownProps {
  collapsed?: boolean;
}

export function UserProfileDropdown({ collapsed = false }: UserProfileDropdownProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
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

  const handleProfileClick = () => {
    navigate('/admin/profile');
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

  if (collapsed) {
    return (
      <div className="relative">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full p-2 relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="relative">
                <Avatar className="h-6 w-6">
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
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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

        <UnreadMessagesDropdown
          isVisible={showUnreadDropdown}
          unreadCounts={unreadCounts}
          onClose={() => setShowUnreadDropdown(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 h-auto p-2 relative"
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

      <UnreadMessagesDropdown
        isVisible={showUnreadDropdown}
        unreadCounts={unreadCounts}
        onClose={() => setShowUnreadDropdown(false)}
      />
    </div>
  );
}