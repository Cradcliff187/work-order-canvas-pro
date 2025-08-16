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
    
    // Handle both prefixed and non-prefixed IDs for backward compatibility
    for (const id of workOrderIds) {
      // Check for exact match (prefixed)
      if (unreadCounts[id] !== undefined) {
        pick[id] = unreadCounts[id];
      }
      // Check for wo: prefixed version
      else if (unreadCounts[`wo:${id}`] !== undefined) {
        pick[id] = unreadCounts[`wo:${id}`];
      }
    }
    
    return pick;
  }, [workOrderIds, unreadCounts]);

  return { data: filtered, isLoading } as const;
}
