
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  isOtherOnline: boolean;
  othersCount: number;
}

/**
 * Lightweight presence indicator for a conversation.
 * Tracks other participants online (any presence with a different user_id).
 */
export function useConversationPresence(conversationId: string | null): PresenceState {
  const [userId, setUserId] = useState<string | null>(null);
  const [othersCount, setOthersCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then((res) => {
      if (!mounted) return;
      setUserId(res.data.user?.id ?? null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`presence:conv:${conversationId}`, {
        config: { presence: { key: userId } },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
        let count = 0;
        for (const key of Object.keys(state)) {
          const presences = state[key] || [];
          for (const p of presences) {
            if (!p?.user_id || p.user_id !== userId) {
              // Count any presence that is not me
              count += 1;
            }
          }
        }
        setOthersCount(count);
      });

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      // Advertise our presence in this conversation
      await channel.track({ user_id: userId, at: new Date().toISOString() });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  return useMemo(
    () => ({ isOtherOnline: othersCount > 0, othersCount }),
    [othersCount]
  );
}
