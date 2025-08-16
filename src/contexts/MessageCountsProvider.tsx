import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export type UnreadCountsMap = Record<string, number>;

interface MessageCountsContextValue {
  unreadCounts: UnreadCountsMap;
  totalUnread: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const MessageCountsContext = createContext<MessageCountsContextValue | undefined>(undefined);

export const MessageCountsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useUserProfile();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCountsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef<number>(0);

  const fetchCounts = useCallback(async () => {
    if (!profile?.id) {
      setUnreadCounts({});
      return;
    }
    setIsLoading(true);
    try {
      // Fetch both work order and conversation unread counts in parallel
      const [workOrderResult, conversationResult] = await Promise.all([
        supabase.rpc('get_unread_message_counts'),
        supabase.rpc('get_conversations_overview')
      ]);
      
      const next: UnreadCountsMap = {};
      
      // Add work order unread counts with "wo:" prefix
      if (!workOrderResult.error && Array.isArray(workOrderResult.data)) {
        for (const row of workOrderResult.data as Array<{ work_order_id: string; unread_count: number }>) {
          // Only add entries for valid work order IDs (not null/undefined)
          if (row.work_order_id && row.work_order_id !== 'null') {
            next[`wo:${row.work_order_id}`] = Number(row.unread_count) || 0;
          }
        }
      }
      
      // Add conversation unread counts with "conv:" prefix
      if (!conversationResult.error && Array.isArray(conversationResult.data)) {
        for (const row of conversationResult.data as Array<any>) {
          const convId = row.conversation_id || row.id;
          const unreadCount = row.unread_count || 0;
          if (unreadCount > 0 && convId) {
            next[`conv:${convId}`] = Number(unreadCount);
          }
        }
      }
      
      if (isMountedRef.current) setUnreadCounts(next);
    } catch (err) {
      console.error('[MessageCountsProvider] fetchCounts error:', err);
    } finally {
      lastRefreshRef.current = Date.now();
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [profile?.id]);

  const scheduleRefresh = useCallback((delay = 200) => {
    const MIN_INTERVAL = 4000; // throttle to at most once every 4s
    const now = Date.now();
    const timeSinceLast = now - lastRefreshRef.current;
    const wait = timeSinceLast >= MIN_INTERVAL ? delay : Math.max(delay, MIN_INTERVAL - timeSinceLast);

    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      fetchCounts();
      lastRefreshRef.current = Date.now();
      refreshTimerRef.current = null;
    }, wait);
  }, [fetchCounts]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Initial load when profile changes
    fetchCounts();

    // Reset previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!profile?.id) return;

    // Single consolidated realtime channel
    const channel = supabase
      .channel('message-counts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_read_receipts', filter: `user_id=eq.${profile.id}` }, () => {
        scheduleRefresh(500);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_read_receipts', filter: `user_id=eq.${profile.id}` }, () => {
        scheduleRefresh(500);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${profile.id}` }, () => {
        // Mark-as-read updates
        scheduleRefresh(500);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_order_messages' }, () => {
        // New messages should update unread counts quickly
        scheduleRefresh(800);
      })
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[MessageCountsProvider] realtime status:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, scheduleRefresh, fetchCounts]);

  const totalUnread = useMemo(() => {
    const total = Object.values(unreadCounts).reduce((s, n) => s + (Number(n) || 0), 0);
    console.log('[MessageCountsProvider] Unread counts:', { 
      total, 
      counts: unreadCounts,
      workOrders: Object.keys(unreadCounts).filter(k => k.startsWith('wo:')).length,
      conversations: Object.keys(unreadCounts).filter(k => k.startsWith('conv:')).length
    });
    return total;
  }, [unreadCounts]);

  const value: MessageCountsContextValue = useMemo(() => ({
    unreadCounts,
    totalUnread,
    isLoading,
    refresh: fetchCounts,
  }), [unreadCounts, totalUnread, isLoading, fetchCounts]);

  return (
    <MessageCountsContext.Provider value={value}>
      {children}
    </MessageCountsContext.Provider>
  );
};

export const useMessageCounts = () => {
  const ctx = useContext(MessageCountsContext);
  if (!ctx) throw new Error('useMessageCounts must be used within MessageCountsProvider');
  return ctx;
};
