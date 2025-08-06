import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApprovalItem } from './useApprovalQueue';

interface OptimisticState {
  optimisticUpdates: Map<string, 'approving' | 'rejecting' | 'approved' | 'rejected'>;
  pendingOperations: Set<string>;
}

export function useOptimisticApprovals() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<OptimisticState>({
    optimisticUpdates: new Map(),
    pendingOperations: new Set()
  });

  const updateOptimisticState = useCallback((itemId: string, status: 'approving' | 'rejecting' | 'approved' | 'rejected') => {
    setState(prev => ({
      ...prev,
      optimisticUpdates: new Map(prev.optimisticUpdates).set(itemId, status),
      pendingOperations: status.endsWith('ing') 
        ? new Set(prev.pendingOperations).add(itemId)
        : new Set([...prev.pendingOperations].filter(id => id !== itemId))
    }));
  }, []);

  const clearOptimisticUpdate = useCallback((itemId: string) => {
    setState(prev => {
      const newUpdates = new Map(prev.optimisticUpdates);
      const newPending = new Set(prev.pendingOperations);
      newUpdates.delete(itemId);
      newPending.delete(itemId);
      return {
        optimisticUpdates: newUpdates,
        pendingOperations: newPending
      };
    });
  }, []);

  const rollbackOptimisticUpdate = useCallback((itemId: string) => {
    clearOptimisticUpdate(itemId);
    // Force refetch of approval queue to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
  }, [clearOptimisticUpdate, queryClient]);

  const applyOptimisticFiltering = useCallback((items: ApprovalItem[]) => {
    return items.filter(item => {
      const status = state.optimisticUpdates.get(item.id);
      // Hide items that have been optimistically approved or rejected
      return !status || !['approved', 'rejected'].includes(status);
    });
  }, [state.optimisticUpdates]);

  const getItemStatus = useCallback((itemId: string) => {
    return state.optimisticUpdates.get(itemId);
  }, [state.optimisticUpdates]);

  const isPending = useCallback((itemId: string) => {
    return state.pendingOperations.has(itemId);
  }, [state.pendingOperations]);

  return {
    updateOptimisticState,
    clearOptimisticUpdate,
    rollbackOptimisticUpdate,
    applyOptimisticFiltering,
    getItemStatus,
    isPending,
    pendingCount: state.pendingOperations.size
  };
}