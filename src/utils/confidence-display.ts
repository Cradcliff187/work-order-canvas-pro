/**
 * Confidence Display Utilities
 * 
 * Handles confidence value formatting and display logic.
 * Ensures decimal values (0.95) display as percentages (95%).
 */

export interface ConfidenceValues {
  vendor_name?: number;
  amount?: number;
  receipt_date?: number;
  [key: string]: number | undefined;
}

/**
 * Formats confidence value for display
 * Handles both decimal (0.95) and percentage (95) formats
 */
export function formatConfidencePercent(confidence: number | undefined): string {
  if (confidence === undefined || confidence === null) return '0%';
  
  // Handle decimal format (0.95 -> 95%)
  if (confidence <= 1) {
    return `${Math.round(confidence * 100)}%`;
  }
  
  // Handle percentage format (95 -> 95%)
  return `${Math.round(confidence)}%`;
}

/**
 * Gets confidence value for a specific field
 */
export function getFieldConfidence(
  confidenceValues: ConfidenceValues | undefined,
  fieldName: keyof ConfidenceValues
): number | undefined {
  if (!confidenceValues) return undefined;
  return confidenceValues[fieldName];
}

/**
 * Validates if confidence value is in correct decimal format (0-1)
 */
export function validateConfidenceFormat(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1;
}

/**
 * Logs confidence debug information
 */
export function logConfidenceDebug(
  label: string,
  confidenceValues: ConfidenceValues | undefined
): void {
  if (process.env.NODE_ENV === 'development' && confidenceValues) {
    console.log(`📊 ${label} Confidence Debug:`, {
      raw: confidenceValues,
      formatted: Object.entries(confidenceValues).reduce((acc, [key, value]) => {
        acc[key] = formatConfidencePercent(value);
        return acc;
      }, {} as Record<string, string>)
    });
  }
}