import { isValidUUID } from "@/lib/utils/validation";

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  store_location?: string;
  status: string;
  organizations?: {
    name: string;
    initials?: string;
  };
}

export interface WorkflowAllocation {
  work_order_id: string;
  allocated_amount: number;
  allocation_notes?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowError[];
  warnings: WorkflowWarning[];
  canSubmit: boolean;
}

export interface WorkflowError {
  type: 'selection' | 'amount' | 'total' | 'duplicate';
  message: string;
  action: string;
  workOrderId?: string;
}

export interface WorkflowWarning {
  type: 'partial' | 'large_amount' | 'rounding';
  message: string;
  workOrderId?: string;
}

export interface AllocationState {
  selectedWorkOrderIds: string[];
  allocations: WorkflowAllocation[];
  totalAmount: number;
  mode: 'select' | 'allocate' | 'confirm';
}

/**
 * Unified allocation workflow validator
 * Single source of truth for all allocation validation
 */
export class AllocationWorkflowValidator {
  private totalAmount: number;
  private selectedWorkOrders: WorkOrder[];
  
  constructor(totalAmount: number, availableWorkOrders: WorkOrder[]) {
    this.totalAmount = totalAmount;
    this.selectedWorkOrders = availableWorkOrders;
  }

  /**
   * Validates the complete workflow state
   */
  validateWorkflow(state: AllocationState): WorkflowValidationResult {
    const errors: WorkflowError[] = [];
    const warnings: WorkflowWarning[] = [];

    // Step 1: Selection validation
    if (state.selectedWorkOrderIds.length === 0) {
      errors.push({
        type: 'selection',
        message: 'No work orders selected',
        action: 'Please select at least one work order from the list above'
      });
    }

    // Step 2: Allocation validation
    if (state.allocations.length === 0 && state.selectedWorkOrderIds.length > 0) {
      errors.push({
        type: 'amount',
        message: 'No amounts allocated',
        action: 'Please set allocation amounts for the selected work orders'
      });
    }

    // Step 3: Individual allocation validation
    const workOrderIds = new Set<string>();
    let totalAllocated = 0;

    state.allocations.forEach((allocation, index) => {
      // Check for valid work order ID
      if (!allocation.work_order_id || !isValidUUID(allocation.work_order_id)) {
        errors.push({
          type: 'selection',
          message: `Invalid work order selection`,
          action: 'Please select a valid work order',
          workOrderId: allocation.work_order_id
        });
        return;
      }

      // Check for duplicates
      if (workOrderIds.has(allocation.work_order_id)) {
        errors.push({
          type: 'duplicate',
          message: 'Duplicate work order',
          action: 'Each work order can only be used once',
          workOrderId: allocation.work_order_id
        });
        return;
      }
      workOrderIds.add(allocation.work_order_id);

      // Check amount
      if (!allocation.allocated_amount || allocation.allocated_amount <= 0) {
        errors.push({
          type: 'amount',
          message: 'Amount must be greater than $0.00',
          action: 'Please enter a positive amount',
          workOrderId: allocation.work_order_id
        });
        return;
      }

      if (allocation.allocated_amount > this.totalAmount) {
        errors.push({
          type: 'amount',
          message: `Amount cannot exceed receipt total of $${this.totalAmount.toFixed(2)}`,
          action: 'Please reduce the amount',
          workOrderId: allocation.work_order_id
        });
        return;
      }

      // Large amount warning
      if (allocation.allocated_amount > 1000) {
        warnings.push({
          type: 'large_amount',
          message: `Large allocation amount: $${allocation.allocated_amount.toFixed(2)}`,
          workOrderId: allocation.work_order_id
        });
      }

      totalAllocated += allocation.allocated_amount;
    });

    // Step 4: Total validation
    const difference = Math.abs(totalAllocated - this.totalAmount);
    
    if (totalAllocated > this.totalAmount) {
      errors.push({
        type: 'total',
        message: `Over-allocated by $${(totalAllocated - this.totalAmount).toFixed(2)}`,
        action: 'Please reduce allocation amounts'
      });
    } else if (difference > 0.01) {
      warnings.push({
        type: 'partial',
        message: `$${(this.totalAmount - totalAllocated).toFixed(2)} unallocated`,
      });
    }

    const canSubmit = errors.length === 0 && state.allocations.length > 0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit
    };
  }

  /**
   * Get suggested allocations based on selection
   */
  getSuggestedAllocations(selectedWorkOrderIds: string[]): WorkflowAllocation[] {
    if (selectedWorkOrderIds.length === 0) return [];

    const amountPerOrder = this.totalAmount / selectedWorkOrderIds.length;
    
    return selectedWorkOrderIds.map((id, index) => ({
      work_order_id: id,
      allocated_amount: index === selectedWorkOrderIds.length - 1 
        ? this.totalAmount - (amountPerOrder * (selectedWorkOrderIds.length - 1)) // Handle rounding
        : Math.round(amountPerOrder * 100) / 100 // Round to 2 decimal places
    }));
  }

  /**
   * Smart work order suggestions based on context
   */
  getWorkOrderSuggestions(vendor?: string, location?: string): string[] {
    // This could be enhanced with ML/history-based suggestions
    // For now, return recent or high-priority work orders
    return this.selectedWorkOrders
      .filter(wo => wo.status === 'assigned' || wo.status === 'in_progress')
      .slice(0, 3)
      .map(wo => wo.id);
  }
}

/**
 * Creates user-friendly action button text
 */
export function getActionButtonText(
  action: 'split' | 'auto' | 'clear',
  selectedCount: number,
  totalAmount: number
): string {
  switch (action) {
    case 'split':
      if (selectedCount === 0) {
        return 'Select work orders to split receipt';
      }
      if (selectedCount === 1) {
        return `Allocate full $${totalAmount.toFixed(2)} to selected work order`;
      }
      return `Split $${totalAmount.toFixed(2)} between ${selectedCount} work orders`;
    
    case 'auto':
      return selectedCount > 0 
        ? `Auto-allocate to ${selectedCount} selected work orders`
        : 'Auto-allocate to suggested work orders';
    
    case 'clear':
      return 'Clear all allocations';
    
    default:
      return 'Allocate';
  }
}

/**
 * Format allocation summary for display
 */
export function formatAllocationSummary(
  allocations: WorkflowAllocation[],
  totalAmount: number
): {
  totalAllocated: number;
  remaining: number;
  percentage: number;
  status: 'perfect' | 'over' | 'under' | 'empty';
} {
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  const remaining = totalAmount - totalAllocated;
  const percentage = totalAmount > 0 ? (totalAllocated / totalAmount) * 100 : 0;
  
  let status: 'perfect' | 'over' | 'under' | 'empty' = 'empty';
  
  if (allocations.length === 0) {
    status = 'empty';
  } else if (Math.abs(remaining) < 0.01) {
    status = 'perfect';
  } else if (remaining < 0) {
    status = 'over';
  } else {
    status = 'under';
  }
  
  return {
    totalAllocated,
    remaining,
    percentage: Math.min(percentage, 100),
    status
  };
}