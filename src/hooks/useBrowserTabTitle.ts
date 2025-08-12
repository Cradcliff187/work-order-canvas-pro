import { useEffect, useMemo } from 'react';
import { useUserProfile } from './useUserProfile';
import { useDebounce } from './useDebounce';
import { useTotalUnreadCount } from './useTotalUnreadCount';

export function useBrowserTabTitle() {
  const { profile, isEmployee, isAdmin } = useUserProfile();
  const { data: totalUnread = 0, isLoading: isLoadingUnread } = useTotalUnreadCount();

  // Calculate title string
  const title = useMemo(() => {
    if (isLoadingUnread) {
      return 'AKC Portal';
    }
    return totalUnread > 0 ? `(${totalUnread}) AKC Portal` : 'AKC Portal';
  }, [totalUnread, isLoadingUnread]);

  // Debounce title updates to prevent flicker
  const debouncedTitle = useDebounce(title, 300);

  useEffect(() => {
    document.title = debouncedTitle;
  }, [debouncedTitle]);
}