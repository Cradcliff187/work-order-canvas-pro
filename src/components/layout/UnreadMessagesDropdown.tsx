import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageSquare, ChevronRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UnreadMessagesDropdownProps {
  isVisible: boolean;
  unreadCounts: Record<string, number>;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  clickOpened?: boolean;
}

export function UnreadMessagesDropdown({ 
  isVisible, 
  unreadCounts, 
  onClose,
  anchorRef,
  clickOpened = false
}: UnreadMessagesDropdownProps) {
  const navigate = useNavigate();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const DROPDOWN_WIDTH = 320;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Get work order IDs that have unread messages
  const workOrderIdsWithUnread = Object.entries(unreadCounts)
    .filter(([, count]) => count > 0)
    .map(([id]) => id);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders-for-dropdown', workOrderIdsWithUnread],
    queryFn: async () => {
      if (workOrderIdsWithUnread.length === 0) return [];

      const { data, error } = await supabase
        .from('work_orders')
        .select('id, work_order_number, title')
        .in('id', workOrderIdsWithUnread)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: workOrderIdsWithUnread.length > 0 && !isMobile && isVisible,
  });

  useEffect(() => {
    if (!isVisible || isMobile) return;
    const updatePosition = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dropdownHeight = containerRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const placeBelow = dropdownHeight + 8 <= spaceBelow || spaceBelow >= spaceAbove;

      const top = placeBelow
        ? Math.min(window.innerHeight - 8, rect.bottom + 2)
        : Math.max(8, rect.top - dropdownHeight - 2);

      const left = Math.max(
        8,
        Math.min(window.innerWidth - 8 - DROPDOWN_WIDTH, rect.right - DROPDOWN_WIDTH)
      );
      setCoords({ top, left });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, isMobile, anchorRef]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);


  const handleWorkOrderClick = (_workOrderId: string) => {
    navigate('/messages');
    onClose();
  };

  const handleViewAll = () => {
    navigate('/messages');
    onClose();
  };

  // Don't render if not visible, on mobile, or no unread messages
  if (!isVisible || isMobile || workOrderIdsWithUnread.length === 0) {
    return null;
  }

  const displayedWorkOrders = workOrders.slice(0, 5);
  const hasMore = workOrders.length > 5;

  const dropdown = (
    <div
      ref={containerRef}
      className="fixed z-[2000] animate-in fade-in-0 zoom-in-95"
      style={{ top: coords.top, left: coords.left }}
      onMouseEnter={() => {
        clearCloseTimeout();
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!clickOpened) {
          setIsHovered(false);
          clearCloseTimeout();
          closeTimeoutRef.current = window.setTimeout(() => {
            onClose();
          }, 600);
        }
      }}
    >
      <Card className="w-80 shadow-lg border bg-popover">
        <div 
          className="absolute -top-2 left-0 right-0 h-4 pointer-events-auto" 
          onMouseEnter={() => setIsHovered(true)}
        />
        {clickOpened && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Unread Messages</span>
            </div>
            <Badge variant="destructive" className="text-xs">
              {Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)} new
            </Badge>
          </div>
          
          {(isLoading || !workOrders) && (
            <div className="flex items-center justify-center py-4">
              <span className="text-sm text-muted-foreground">Loading messages...</span>
            </div>
          )}
          
          <div className="space-y-1">
            {displayedWorkOrders.map((workOrder) => {
              const unreadCount = unreadCounts[workOrder.id] || 0;
              return (
                <Button
                  key={workOrder.id}
                  variant="ghost"
                  className="w-full justify-start p-2 h-auto text-left hover:bg-accent"
                  onClick={() => handleWorkOrderClick(workOrder.id)}
                >
                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-xs text-primary">
                        {workOrder.work_order_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({unreadCount} unread)
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {workOrder.title}
                    </span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-3 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleViewAll}
              >
                View all work orders with messages
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return createPortal(dropdown, document.body);
}