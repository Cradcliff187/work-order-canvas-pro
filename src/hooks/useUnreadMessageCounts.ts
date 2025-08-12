import { useMemo } from 'react';
import { useMessageCounts } from '@/contexts/MessageCountsProvider';

/**
 * Centralized unread message counts
 *
 * This wrapper now reads from MessageCountsProvider to avoid duplicate
 * realtime channels and refetch storms. The signature remains the same
 * for backward compatibility. workOrderIds can be provided to filter the
 * returned map; otherwise all accessible counts are returned.
 */
export function useUnreadMessageCounts(
  workOrderIds: string[] = [],
  _profile?: any,
  _isEmployee?: () => boolean,
  _isAdmin?: () => boolean
) {
  const { unreadCounts, isLoading } = useMessageCounts();

  const filtered = useMemo(() => {
    if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) return unreadCounts;
    const pick: Record<string, number> = {};
    for (const id of workOrderIds) {
      const v = unreadCounts[id];
      if (typeof v === 'number') pick[id] = v;
    }
    return pick;
  }, [workOrderIds, unreadCounts]);

  return { data: filtered, isLoading } as const;
}
