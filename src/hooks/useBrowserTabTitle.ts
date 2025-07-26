import { useEffect } from 'react';
import { useUserAccessibleWorkOrders } from './useUserAccessibleWorkOrders';
import { useUnreadMessageCounts } from './useUnreadMessageCounts';

export function useBrowserTabTitle() {
  const { data: accessibleWorkOrderIds = [], isLoading: isLoadingWorkOrders } = useUserAccessibleWorkOrders();
  const { data: unreadCounts = {}, isLoading: isLoadingUnread } = useUnreadMessageCounts(accessibleWorkOrderIds);

  useEffect(() => {
    // Don't update title while loading
    if (isLoadingWorkOrders || isLoadingUnread) {
      return;
    }

    // Calculate total unread count
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    // Update document title
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) WorkOrderPro`;
    } else {
      document.title = 'WorkOrderPro';
    }
  }, [unreadCounts, isLoadingWorkOrders, isLoadingUnread]);
}