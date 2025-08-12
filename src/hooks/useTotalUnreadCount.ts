import { useMemo } from 'react';
import { useMessageCounts } from '@/contexts/MessageCountsProvider';

export function useTotalUnreadCount() {
  const { totalUnread, isLoading } = useMessageCounts();

  // Maintain the same return shape used elsewhere
  const total = useMemo(() => totalUnread, [totalUnread]);
  return { data: total, isLoading } as const;
}
