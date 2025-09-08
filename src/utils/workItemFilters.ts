import type { WorkItem } from '@/hooks/useAllWorkItems';

export interface RecentlyClockedWorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  last_clocked: string;
}

/**
 * Filters work items to get only work orders (not projects) and limits the results.
 * Used for displaying recent work orders in horizontal scroll components.
 * 
 * @param workItems - Array of work items to filter
 * @param limit - Maximum number of work orders to return (default: 3)
 * @returns Filtered array of work order items
 */
export const filterRecentWorkOrders = (workItems: WorkItem[], limit: number = 3): WorkItem[] => {
  return workItems
    .filter(item => item.type === 'work_order')
    .slice(0, limit);
};

/**
 * Filters recently clocked work orders and limits the results.
 * Used for quick start chips and other components that need recent work order access.
 * 
 * @param recentlyClockedWorkOrders - Array of recently clocked work orders
 * @param limit - Maximum number of work orders to return (default: 3)
 * @returns Filtered array of recently clocked work orders
 */
export const filterQuickStartItems = (
  recentlyClockedWorkOrders: RecentlyClockedWorkOrder[], 
  limit: number = 3
): RecentlyClockedWorkOrder[] => {
  return recentlyClockedWorkOrders.slice(0, limit);
};