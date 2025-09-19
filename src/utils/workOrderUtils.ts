/**
 * Utility functions for work order reference display
 */

/**
 * Gets a consistent work order reference display string
 * Uses work_order_reference if available, otherwise falls back to work_order_number or generates a fallback
 */
export function getWorkOrderReference(
  workOrderReference?: string | null,
  workOrderNumber?: string | null,
  workOrderId?: string
): string {
  // Use work_order_reference if available (from database function)
  if (workOrderReference && workOrderReference.trim() !== '') {
    return workOrderReference;
  }
  
  // Fallback to work_order_number if available
  if (workOrderNumber && workOrderNumber.trim() !== '') {
    return workOrderNumber;
  }
  
  // Final fallback to formatted work order ID
  if (workOrderId) {
    return `WO-${workOrderId.substring(0, 8)}`;
  }
  
  return 'N/A';
}

/**
 * Gets a display string combining work order reference and title
 */
export function getWorkOrderDisplay(
  workOrderReference?: string | null,
  workOrderNumber?: string | null,
  workOrderId?: string,
  title?: string | null
): string {
  const reference = getWorkOrderReference(workOrderReference, workOrderNumber, workOrderId);
  
  if (title && title.trim() !== '') {
    return `${reference} — ${title}`;
  }
  
  return reference;
}

/**
 * Formats work order reference for billing line items
 */
export function formatBillingItemReference(
  workOrderReference?: string | null,
  workOrderNumber?: string | null,
  workOrderId?: string,
  description?: string | null
): string {
  const reference = getWorkOrderReference(workOrderReference, workOrderNumber, workOrderId);
  
  if (description && description.trim() !== '') {
    return `${reference} - ${description}`;
  }
  
  return reference;
}