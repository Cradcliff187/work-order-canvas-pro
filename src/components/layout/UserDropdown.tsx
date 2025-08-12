import React, { useState, useEffect, useRef } from 'react';
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
import { useUserAccessibleWorkOrders } from '@/hooks/useUserAccessibleWorkOrders';
import { useUnreadMessageCounts } from '@/hooks/useUnreadMessageCounts';
import { UnreadMessagesDropdown } from './UnreadMessagesDropdown';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
export function UserDropdown() {
  const { profile, signOut } = useAuth();
  const { primaryRole, isEmployee, isAdmin } = useUserProfile();
  const [showUnreadDropdown, setShowUnreadDropdown] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useIsMobile();

  // Get accessible work orders and unread counts
  const { data: workOrderIds = [] } = useUserAccessibleWorkOrders();
  const { data: unreadCounts = {} } = useUnreadMessageCounts(workOrderIds, profile, isEmployee, isAdmin);

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
    <div className="relative flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            ref={buttonRef}
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
              <span className="text-muted-foreground capitalize">{primaryRole}</span>
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

      {isMobile && totalUnread > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/messages')}
          aria-label="Open messages"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="sr-only">View unread messages</span>
          <span className="absolute -top-1 -right-1 text-[10px] leading-none rounded-full px-1 bg-destructive text-destructive-foreground border border-background">
            {totalUnread}
          </span>
        </Button>
      )}

      <UnreadMessagesDropdown
        isVisible={showUnreadDropdown}
        unreadCounts={unreadCounts}
        onClose={() => setShowUnreadDropdown(false)}
        anchorRef={buttonRef}
      />
    </div>
  );
}
