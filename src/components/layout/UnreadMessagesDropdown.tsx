import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UnreadMessagesDropdownProps {
  isVisible: boolean;
  unreadCounts: Record<string, number>;
  onClose: () => void;
}

export function UnreadMessagesDropdown({ 
  isVisible, 
  unreadCounts, 
  onClose 
}: UnreadMessagesDropdownProps) {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [isHovered, setIsHovered] = useState(false);

  // Get work order IDs that have unread messages
  const workOrderIdsWithUnread = Object.entries(unreadCounts)
    .filter(([, count]) => count > 0)
    .map(([id]) => id);

  const { data: workOrders = [] } = useQuery({
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
    enabled: workOrderIdsWithUnread.length > 0,
  });

  const handleWorkOrderClick = (workOrderId: string) => {
    if (!profile?.user_type) return;

    let route = '';
    switch (profile.user_type) {
      case 'admin':
      case 'employee':
        route = `/admin/work-orders/${workOrderId}`;
        break;
      case 'partner':
        route = `/partner/work-orders/${workOrderId}`;
        break;
      case 'subcontractor':
        route = `/subcontractor/work-orders/${workOrderId}`;
        break;
    }

    if (route) {
      navigate(route);
      onClose();
    }
  };

  const handleViewAll = () => {
    if (!profile?.user_type) return;

    let route = '';
    switch (profile.user_type) {
      case 'admin':
      case 'employee':
        route = '/admin/work-orders';
        break;
      case 'partner':
        route = '/partner/work-orders';
        break;
      case 'subcontractor':
        route = '/subcontractor/work-orders';
        break;
    }

    if (route) {
      navigate(route);
      onClose();
    }
  };

  // Don't render if not visible or no unread messages
  if (!isVisible || workOrderIdsWithUnread.length === 0) {
    return null;
  }

  const displayedWorkOrders = workOrders.slice(0, 5);
  const hasMore = workOrders.length > 5;

  return (
    <div 
      className="absolute top-full right-0 mt-2 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        onClose();
      }}
    >
      <Card className="w-80 shadow-lg border bg-popover">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Unread Messages</span>
          </div>
          
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
}