import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';
import { useUnreadMessageCounts } from './useUnreadMessageCounts';

export function useTotalUnreadCount() {
  const { profile, isEmployee, isAdmin } = useUserProfile();
  // Pass empty list; hook will return all accessible counts
  const { data: unreadCounts = {}, isLoading } = useUnreadMessageCounts([], profile, isEmployee, isAdmin);

  const total = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [unreadCounts]);

  return { data: total, isLoading } as const;
}
