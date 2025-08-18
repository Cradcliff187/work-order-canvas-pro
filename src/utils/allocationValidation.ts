import { isValidUUID } from "@/lib/utils/validation";

export interface AllocationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Allocation {
  work_order_id: string;
  allocated_amount: number;
  allocation_notes?: string;
}

export interface AllocationValidationOptions {
  totalAmount?: number;
  allowPartialAllocation?: boolean;
  minAllocationAmount?: number;
}

/**
 * Validates a single allocation
 */
export function validateAllocation(
  allocation: Allocation,
  options: AllocationValidationOptions = {}
): AllocationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { totalAmount, minAllocationAmount = 0.01 } = options;

  // Check work_order_id
  if (!allocation.work_order_id) {
    errors.push("Work order must be selected");
  } else if (!isValidUUID(allocation.work_order_id)) {
    errors.push("Invalid work order selection");
  }

  // Check allocated_amount
  if (!allocation.allocated_amount || allocation.allocated_amount <= 0) {
    errors.push("Amount must be greater than $0.00");
  } else if (allocation.allocated_amount < minAllocationAmount) {
    errors.push(`Amount must be at least $${minAllocationAmount.toFixed(2)}`);
  }

  // Check against total amount if provided
  if (totalAmount && allocation.allocated_amount > totalAmount) {
    errors.push(`Amount cannot exceed receipt total of $${totalAmount.toFixed(2)}`);
  }

  // Warnings for large amounts
  if (allocation.allocated_amount > 1000) {
    warnings.push("Large allocation amount - please verify");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates an array of allocations
 */
export function validateAllocations(
  allocations: Allocation[],
  options: AllocationValidationOptions = {}
): AllocationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { totalAmount, allowPartialAllocation = true } = options;

  // Check for empty allocations
  if (!allocations || allocations.length === 0) {
    errors.push("At least one work order allocation is required");
    return { isValid: false, errors, warnings };
  }

  // Validate each allocation
  let totalAllocated = 0;
  const workOrderIds = new Set<string>();

  for (let i = 0; i < allocations.length; i++) {
    const allocation = allocations[i];
    const result = validateAllocation(allocation, options);
    
    // Add errors with index for clarity
    result.errors.forEach(error => 
      errors.push(`Allocation ${i + 1}: ${error}`)
    );
    result.warnings.forEach(warning => 
      warnings.push(`Allocation ${i + 1}: ${warning}`)
    );

    // Check for duplicates
    if (allocation.work_order_id && workOrderIds.has(allocation.work_order_id)) {
      errors.push(`Allocation ${i + 1}: Duplicate work order - each work order can only be used once`);
    } else if (allocation.work_order_id) {
      workOrderIds.add(allocation.work_order_id);
    }

    // Sum up allocated amounts
    if (allocation.allocated_amount > 0) {
      totalAllocated += allocation.allocated_amount;
    }
  }

  // Check total allocation against receipt amount
  if (totalAmount) {
    const difference = Math.abs(totalAllocated - totalAmount);
    
    if (totalAllocated > totalAmount) {
      errors.push(`Total allocated ($${totalAllocated.toFixed(2)}) exceeds receipt amount ($${totalAmount.toFixed(2)})`);
    } else if (!allowPartialAllocation && difference > 0.01) {
      errors.push(`Total allocated ($${totalAllocated.toFixed(2)}) must equal receipt amount ($${totalAmount.toFixed(2)})`);
    } else if (allowPartialAllocation && difference > 0.01 && totalAllocated < totalAmount) {
      warnings.push(`Partial allocation: $${(totalAmount - totalAllocated).toFixed(2)} unallocated`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Filters out invalid allocations and returns only valid ones
 */
export function sanitizeAllocations(
  allocations: Allocation[],
  options: AllocationValidationOptions = {}
): Allocation[] {
  if (!allocations) return [];

  return allocations.filter(allocation => {
    const result = validateAllocation(allocation, options);
    return result.isValid;
  });
}

/**
 * Gets user-friendly error messages for form display
 */
export function getAllocationErrors(
  allocations: Allocation[],
  options: AllocationValidationOptions = {}
): {
  fieldErrors: Record<string, string[]>;
  generalErrors: string[];
  warnings: string[];
} {
  const result = validateAllocations(allocations, options);
  const fieldErrors: Record<string, string[]> = {};
  const generalErrors: string[] = [];

  // Separate field-specific errors from general errors
  result.errors.forEach(error => {
    if (error.startsWith('Allocation ')) {
      const match = error.match(/^Allocation (\d+): (.+)$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const message = match[2];
        const key = `allocation_${index}`;
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(message);
      }
    } else {
      generalErrors.push(error);
    }
  });

  return {
    fieldErrors,
    generalErrors,
    warnings: result.warnings
  };
}

/**
 * Quick validation check for form submission
 */
export function canSubmitAllocations(
  allocations: Allocation[],
  totalAmount: number
): boolean {
  const result = validateAllocations(allocations, {
    totalAmount,
    allowPartialAllocation: true, // Allow partial for flexibility
    minAllocationAmount: 0.01
  });
  
  return result.isValid;
}

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  MIN_ALLOCATION_AMOUNT: 0.01,
  MAX_ALLOCATION_AMOUNT: 100000,
  LARGE_AMOUNT_WARNING_THRESHOLD: 1000,
} as const;