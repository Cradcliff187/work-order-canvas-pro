import { useMemo, useCallback } from 'react';

interface Allocation {
  work_order_id: string;
  allocated_amount: number;
}

interface CalculationState {
  allocations: Allocation[];
  totalAmount: number;
  isValid: boolean;
  remaining: number;
  totalAllocated: number;
  percentages: Record<string, number>;
}

interface CalculationOptions {
  precision?: number;
  allowOverAllocation?: boolean;
  roundingMode?: 'round' | 'floor' | 'ceil';
}

interface OptimisticUpdate {
  id: string;
  timestamp: number;
  originalState: CalculationState;
  newState: CalculationState;
  action: string;
}

class AllocationCalculator {
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private memoCache: Map<string, any> = new Map();
  
  constructor(private options: CalculationOptions = {}) {
    this.options = {
      precision: 2,
      allowOverAllocation: false,
      roundingMode: 'round',
      ...options
    };
  }

  // Core calculation methods
  calculateState(allocations: Allocation[], totalAmount: number): CalculationState {
    const cacheKey = `state-${JSON.stringify(allocations)}-${totalAmount}`;
    
    if (this.memoCache.has(cacheKey)) {
      return this.memoCache.get(cacheKey);
    }

    // Filter out invalid allocations before calculation
    const validAllocations = allocations.filter(alloc => 
      alloc && alloc.work_order_id && typeof alloc.allocated_amount === 'number' && alloc.allocated_amount > 0
    );

    const totalAllocated = this.roundToPrecision(
      validAllocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0)
    );
    
    const remaining = this.roundToPrecision(totalAmount - totalAllocated);
    const isValid = Math.abs(remaining) < Math.pow(10, -this.options.precision!);
    
    const percentages: Record<string, number> = {};
    if (totalAmount > 0) {
      allocations.forEach(alloc => {
        percentages[alloc.work_order_id] = this.roundToPrecision(
          (alloc.allocated_amount / totalAmount) * 100
        );
      });
    }

    const state: CalculationState = {
      allocations: [...allocations],
      totalAmount,
      isValid,
      remaining,
      totalAllocated,
      percentages
    };

    this.memoCache.set(cacheKey, state);
    return state;
  }

  // Bi-directional calculations
  updateByAmount(
    allocations: Allocation[], 
    workOrderId: string, 
    newAmount: number, 
    totalAmount: number
  ): Allocation[] {
    const rounded = this.roundToPrecision(newAmount);
    
    return allocations.map(alloc => 
      alloc.work_order_id === workOrderId 
        ? { ...alloc, allocated_amount: rounded }
        : alloc
    );
  }

  updateByPercentage(
    allocations: Allocation[], 
    workOrderId: string, 
    newPercentage: number, 
    totalAmount: number
  ): Allocation[] {
    const newAmount = this.roundToPrecision((newPercentage / 100) * totalAmount);
    return this.updateByAmount(allocations, workOrderId, newAmount, totalAmount);
  }

  // Smart rounding and remainder distribution
  distributeRemainder(allocations: Allocation[], totalAmount: number): Allocation[] {
    if (!allocations.length) return allocations;

    const currentTotal = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    const remainder = this.roundToPrecision(totalAmount - currentTotal);
    
    if (Math.abs(remainder) < Math.pow(10, -this.options.precision!)) {
      return allocations;
    }

    // Distribute remainder to largest allocations first
    const sorted = [...allocations].sort((a, b) => b.allocated_amount - a.allocated_amount);
    const remainderPerItem = this.roundToPrecision(remainder / allocations.length);
    const finalRemainder = this.roundToPrecision(remainder - (remainderPerItem * allocations.length));

    const distributed = allocations.map((alloc, index) => {
      const isLargest = sorted[0].work_order_id === alloc.work_order_id;
      const adjustment = remainderPerItem + (isLargest ? finalRemainder : 0);
      
      return {
        ...alloc,
        allocated_amount: this.roundToPrecision(alloc.allocated_amount + adjustment)
      };
    });

    return distributed;
  }

  // Advanced allocation strategies
  splitEvenly(workOrderIds: string[], totalAmount: number): Allocation[] {
    if (!workOrderIds.length) return [];

    const evenAmount = this.roundToPrecision(totalAmount / workOrderIds.length);
    const remainder = this.roundToPrecision(totalAmount - (evenAmount * workOrderIds.length));

    return workOrderIds.map((id, index) => ({
      work_order_id: id,
      allocated_amount: index === 0 ? evenAmount + remainder : evenAmount
    }));
  }

  splitByRatio(
    workOrderIds: string[], 
    ratios: number[], 
    totalAmount: number
  ): Allocation[] {
    if (workOrderIds.length !== ratios.length) {
      throw new Error('Work order IDs and ratios arrays must have same length');
    }

    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (totalRatio === 0) return [];

    const allocations: Allocation[] = [];
    let remainingAmount = totalAmount;

    workOrderIds.forEach((id, index) => {
      const isLast = index === workOrderIds.length - 1;
      const amount = isLast 
        ? remainingAmount 
        : this.roundToPrecision((ratios[index] / totalRatio) * totalAmount);
      
      allocations.push({
        work_order_id: id,
        allocated_amount: amount
      });
      
      remainingAmount = this.roundToPrecision(remainingAmount - amount);
    });

    return allocations;
  }

  // Optimistic updates with rollback
  createOptimisticUpdate(
    id: string,
    originalState: CalculationState,
    newState: CalculationState,
    action: string
  ): void {
    this.optimisticUpdates.set(id, {
      id,
      timestamp: Date.now(),
      originalState,
      newState,
      action
    });

    // Auto-cleanup old updates (keep last 10)
    if (this.optimisticUpdates.size > 10) {
      const oldest = Array.from(this.optimisticUpdates.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
      this.optimisticUpdates.delete(oldest[0]);
    }
  }

  rollbackOptimisticUpdate(id: string): CalculationState | null {
    const update = this.optimisticUpdates.get(id);
    if (!update) return null;

    this.optimisticUpdates.delete(id);
    return update.originalState;
  }

  commitOptimisticUpdate(id: string): void {
    this.optimisticUpdates.delete(id);
  }

  // Validation
  validateAllocation(allocation: Allocation): string[] {
    const errors: string[] = [];

    if (allocation.allocated_amount < 0) {
      errors.push('Amount cannot be negative');
    }

    if (!allocation.work_order_id) {
      errors.push('Work order ID is required');
    }

    if (!Number.isFinite(allocation.allocated_amount)) {
      errors.push('Amount must be a valid number');
    }

    return errors;
  }

  validateAllocations(allocations: Allocation[], totalAmount: number): string[] {
    const errors: string[] = [];

    // Check individual allocations
    allocations.forEach((alloc, index) => {
      const allocErrors = this.validateAllocation(alloc);
      allocErrors.forEach(error => errors.push(`Allocation ${index + 1}: ${error}`));
    });

    // Check for duplicates
    const workOrderIds = allocations.map(a => a.work_order_id);
    const duplicates = workOrderIds.filter((id, index) => workOrderIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate work orders: ${duplicates.join(', ')}`);
    }

    // Check total
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    const difference = Math.abs(totalAmount - totalAllocated);
    
    if (difference > Math.pow(10, -this.options.precision!)) {
      const isOver = totalAllocated > totalAmount;
      errors.push(
        `${isOver ? 'Over' : 'Under'}-allocated by $${difference.toFixed(this.options.precision)}`
      );
    }

    return errors;
  }

  // Performance optimization
  clearCache(): void {
    this.memoCache.clear();
  }

  getCacheSize(): number {
    return this.memoCache.size;
  }

  // Utility methods
  private roundToPrecision(value: number): number {
    const factor = Math.pow(10, this.options.precision!);
    
    switch (this.options.roundingMode) {
      case 'floor':
        return Math.floor(value * factor) / factor;
      case 'ceil':
        return Math.ceil(value * factor) / factor;
      default:
        return Math.round(value * factor) / factor;
    }
  }

  // Quick actions
  roundToNearest(allocations: Allocation[], amount: number = 5): Allocation[] {
    return allocations.map(alloc => ({
      ...alloc,
      allocated_amount: Math.round(alloc.allocated_amount / amount) * amount
    }));
  }

  clearSmallAmounts(allocations: Allocation[], threshold: number = 0.01): Allocation[] {
    return allocations.filter(alloc => alloc.allocated_amount >= threshold);
  }

  normalizeToTotal(allocations: Allocation[], targetTotal: number): Allocation[] {
    const currentTotal = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    if (currentTotal === 0) return allocations;

    const factor = targetTotal / currentTotal;
    return this.distributeRemainder(
      allocations.map(alloc => ({
        ...alloc,
        allocated_amount: this.roundToPrecision(alloc.allocated_amount * factor)
      })),
      targetTotal
    );
  }
}

// React hook for using the calculator
export const useAllocationCalculator = (options?: CalculationOptions) => {
  const calculator = useMemo(() => new AllocationCalculator(options), [options]);

  const calculateState = useCallback(
    (allocations: Allocation[], totalAmount: number) => 
      calculator.calculateState(allocations, totalAmount),
    [calculator]
  );

  const updateByAmount = useCallback(
    (allocations: Allocation[], workOrderId: string, amount: number, totalAmount: number) =>
      calculator.updateByAmount(allocations, workOrderId, amount, totalAmount),
    [calculator]
  );

  const updateByPercentage = useCallback(
    (allocations: Allocation[], workOrderId: string, percentage: number, totalAmount: number) =>
      calculator.updateByPercentage(allocations, workOrderId, percentage, totalAmount),
    [calculator]
  );

  const distributeRemainder = useCallback(
    (allocations: Allocation[], totalAmount: number) =>
      calculator.distributeRemainder(allocations, totalAmount),
    [calculator]
  );

  const splitEvenly = useCallback(
    (workOrderIds: string[], totalAmount: number) =>
      calculator.splitEvenly(workOrderIds, totalAmount),
    [calculator]
  );

  const splitByRatio = useCallback(
    (workOrderIds: string[], ratios: number[], totalAmount: number) =>
      calculator.splitByRatio(workOrderIds, ratios, totalAmount),
    [calculator]
  );

  const validateAllocations = useCallback(
    (allocations: Allocation[], totalAmount: number) =>
      calculator.validateAllocations(allocations, totalAmount),
    [calculator]
  );

  const roundToNearest = useCallback(
    (allocations: Allocation[], amount?: number) =>
      calculator.roundToNearest(allocations, amount),
    [calculator]
  );

  const normalizeToTotal = useCallback(
    (allocations: Allocation[], targetTotal: number) =>
      calculator.normalizeToTotal(allocations, targetTotal),
    [calculator]
  );

  return {
    calculateState,
    updateByAmount,
    updateByPercentage,
    distributeRemainder,
    splitEvenly,
    splitByRatio,
    validateAllocations,
    roundToNearest,
    normalizeToTotal,
    clearCache: calculator.clearCache.bind(calculator),
    getCacheSize: calculator.getCacheSize.bind(calculator)
  };
};

export default AllocationCalculator;
