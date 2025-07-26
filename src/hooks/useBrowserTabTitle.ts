import { useEffect, useMemo } from 'react';
import { useUserAccessibleWorkOrders } from './useUserAccessibleWorkOrders';
import { useUnreadMessageCounts } from './useUnreadMessageCounts';
import { useDebounce } from './useDebounce';

export function useBrowserTabTitle() {
  const { data: accessibleWorkOrderIds = [], isLoading: isLoadingWorkOrders } = useUserAccessibleWorkOrders();
  const { data: unreadCounts = {}, isLoading: isLoadingUnread } = useUnreadMessageCounts(accessibleWorkOrderIds);

  // Calculate title string
  const title = useMemo(() => {
    // Don't calculate title while loading
    if (isLoadingWorkOrders || isLoadingUnread) {
      return 'WorkOrderPro';
    }

    // Calculate total unread count
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    // Return appropriate title
    return totalUnread > 0 ? `(${totalUnread}) WorkOrderPro` : 'WorkOrderPro';
  }, [unreadCounts, isLoadingWorkOrders, isLoadingUnread]);

  // Debounce title updates to prevent flicker
  const debouncedTitle = useDebounce(title, 300);

  useEffect(() => {
    document.title = debouncedTitle;
  }, [debouncedTitle]);
}