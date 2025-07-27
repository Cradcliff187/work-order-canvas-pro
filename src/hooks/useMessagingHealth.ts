import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { useState, useEffect } from 'react';

interface MessageQueueStatus {
  total24h: number;
  offlineQueueSize: number;
  failedMessages: number;
  averageDeliveryTime: number;
}

interface ReadReceiptAnalytics {
  unreadByWorkOrder: Array<{
    work_order_id: string;
    work_order_number: string;
    unread_count: number;
  }>;
  averageTimeToRead: number;
  usersWithMostUnread: Array<{
    user_id: string;
    user_name: string;
    unread_count: number;
  }>;
}

interface MessageVolumeMetrics {
  hourlyMessages: Array<{
    hour: string;
    count: number;
  }>;
  publicVsInternal: {
    public: number;
    internal: number;
  };
  mostActiveWorkOrders: Array<{
    work_order_id: string;
    work_order_number: string;
    message_count: number;
  }>;
}

interface RealtimeHealthIndicators {
  websocketConnected: boolean;
  activeSubscriptions: number;
  lastMessageReceived: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface MessagingHealth {
  queueStatus: MessageQueueStatus;
  readReceipts: ReadReceiptAnalytics;
  volumeMetrics: MessageVolumeMetrics;
  realtimeHealth: RealtimeHealthIndicators;
}

export const useMessagingHealth = () => {
  const { isOnline } = useNetworkStatus();
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);

  // Track real-time message updates
  useEffect(() => {
    const channel = supabase
      .channel('messaging-health-monitor')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_order_messages'
      }, () => {
        setLastMessageTime(new Date());
      })
      .subscribe();

    setActiveSubscriptions(1);

    return () => {
      supabase.removeChannel(channel);
      setActiveSubscriptions(0);
    };
  }, []);

  return useQuery({
    queryKey: ['messaging-health'],
    queryFn: async (): Promise<MessagingHealth> => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch message queue status
      const { data: messages24h } = await supabase
        .from('work_order_messages')
        .select('id, created_at')
        .gte('created_at', yesterday.toISOString());

      // Get offline queue size from localStorage
      const offlineQueueSize = JSON.parse(localStorage.getItem('offline_message_queue') || '[]').length;

      // Fetch hourly message breakdown
      const { data: hourlyData } = await supabase
        .from('work_order_messages')
        .select('created_at')
        .gte('created_at', yesterday.toISOString())
        .order('created_at');

      // Process hourly data
      const hourlyMessages = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(yesterday.getTime() + i * 60 * 60 * 1000);
        const hourString = hour.getHours().toString().padStart(2, '0') + ':00';
        const count = hourlyData?.filter(msg => {
          const msgHour = new Date(msg.created_at).getHours();
          return msgHour === hour.getHours();
        }).length || 0;
        return { hour: hourString, count };
      });

      // Fetch public vs internal message ratio
      const { data: publicMessages } = await supabase
        .from('work_order_messages')
        .select('id')
        .eq('is_internal', false)
        .gte('created_at', yesterday.toISOString());

      const { data: internalMessages } = await supabase
        .from('work_order_messages')
        .select('id')
        .eq('is_internal', true)
        .gte('created_at', yesterday.toISOString());

      // Fetch most active work orders
      const { data: activeWorkOrders } = await supabase
        .from('work_order_messages')
        .select(`
          work_order_id,
          work_orders!inner(work_order_number)
        `)
        .gte('created_at', yesterday.toISOString());

      const workOrderCounts = activeWorkOrders?.reduce((acc, msg) => {
        const key = msg.work_order_id;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const mostActiveWorkOrders = Object.entries(workOrderCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([work_order_id, count]) => {
          const workOrder = activeWorkOrders?.find(msg => msg.work_order_id === work_order_id);
          return {
            work_order_id,
            work_order_number: workOrder?.work_orders?.work_order_number || 'N/A',
            message_count: count
          };
        });

      // Fetch unread message analytics - simplified query
      const { data: unreadData } = await supabase
        .from('work_order_messages')
        .select(`
          work_order_id,
          work_orders!inner(work_order_number)
        `)
        .limit(100);

      // Group by work order and count (simplified)
      const unreadByWorkOrder = unreadData?.reduce((acc, msg) => {
        const existing = acc.find(item => item.work_order_id === msg.work_order_id);
        if (existing) {
          existing.unread_count += 1;
        } else {
          acc.push({
            work_order_id: msg.work_order_id,
            work_order_number: msg.work_orders?.work_order_number || 'N/A',
            unread_count: 1
          });
        }
        return acc;
      }, [] as Array<{ work_order_id: string; work_order_number: string; unread_count: number; }>)
      .sort((a, b) => b.unread_count - a.unread_count)
      .slice(0, 10) || [];

      // Fetch users with most unread messages (simplified)
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .limit(5);

      const usersWithMostUnread = userData?.map(user => ({
        user_id: user.id,
        user_name: `${user.first_name} ${user.last_name}`,
        unread_count: Math.floor(Math.random() * 10) // Mock data for now
      })) || [];

      // Calculate average time to read (mock calculation for now)
      const averageTimeToRead = 45; // minutes - would need more complex query

      // Determine connection quality
      let connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected' = 'disconnected';
      if (isOnline) {
        if (lastMessageTime && (now.getTime() - lastMessageTime.getTime()) < 5 * 60 * 1000) {
          connectionQuality = 'excellent';
        } else if (activeSubscriptions > 0) {
          connectionQuality = 'good';
        } else {
          connectionQuality = 'poor';
        }
      }

      return {
        queueStatus: {
          total24h: messages24h?.length || 0,
          offlineQueueSize,
          failedMessages: 0, // Would need to track failed messages
          averageDeliveryTime: 1.2 // seconds - mock value
        },
        readReceipts: {
          unreadByWorkOrder,
          averageTimeToRead,
          usersWithMostUnread
        },
        volumeMetrics: {
          hourlyMessages,
          publicVsInternal: {
            public: publicMessages?.length || 0,
            internal: internalMessages?.length || 0
          },
          mostActiveWorkOrders
        },
        realtimeHealth: {
          websocketConnected: isOnline && activeSubscriptions > 0,
          activeSubscriptions,
          lastMessageReceived: lastMessageTime,
          connectionQuality
        }
      };
    },
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
};