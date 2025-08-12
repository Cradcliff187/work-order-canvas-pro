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

  const fetchCounts = useCallback(async () => {
    if (!profile?.id) {
      setUnreadCounts({});
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_unread_message_counts');
      if (error) throw error;
      const next: UnreadCountsMap = {};
      if (Array.isArray(data)) {
        for (const row of data as Array<{ work_order_id: string; unread_count: number }>) {
          next[row.work_order_id] = Number(row.unread_count) || 0;
        }
      }
      if (isMountedRef.current) setUnreadCounts(next);
    } catch (err) {
      console.error('[MessageCountsProvider] fetchCounts error:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [profile?.id]);

  const scheduleRefresh = useCallback((delay = 200) => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      fetchCounts();
      refreshTimerRef.current = null;
    }, delay);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_order_messages' }, () => {
        // New message added anywhere user has access -> refresh counts
        scheduleRefresh(200);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_read_receipts', filter: `user_id=eq.${profile.id}` }, () => {
        scheduleRefresh(150);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_read_receipts', filter: `user_id=eq.${profile.id}` }, () => {
        scheduleRefresh(150);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${profile.id}` }, () => {
        // Mark-as-read updates
        scheduleRefresh(120);
      })
      .subscribe((status) => {
        console.log('[MessageCountsProvider] channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, scheduleRefresh, fetchCounts]);

  const totalUnread = useMemo(() => Object.values(unreadCounts).reduce((s, n) => s + (Number(n) || 0), 0), [unreadCounts]);

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
