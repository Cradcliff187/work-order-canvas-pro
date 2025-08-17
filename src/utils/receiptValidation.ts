/**
 * Progressive validation utilities for receipt fields
 * Provides helpful validation that guides rather than blocks users
 */

export type ValidationSeverity = 'info' | 'warning' | 'error';
export type FieldType = 'vendor' | 'amount' | 'date' | 'description';

export interface ValidationResult {
  isValid: boolean;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  formatExample?: string;
}

export interface FieldValidationConfig {
  required: boolean;
  minConfidence?: number;
  formatExamples: string[];
  suggestions?: string[];
}

/**
 * Common vendor names for validation and suggestions
 */
export const COMMON_VENDORS = [
  'Home Depot', 'Lowes', 'Menards', 'Harbor Freight',
  'Grainger', 'Ferguson', 'Shell', 'BP', 'Speedway',
  'Circle K', 'McDonald\'s', 'Subway', 'Jimmy Johns',
  'Walmart', 'Target', 'Amazon', 'Office Depot',
  'Staples', 'Best Buy', 'Costco', 'Sam\'s Club'
];

/**
 * Field validation configurations
 */
export const FIELD_CONFIGS: Record<FieldType, FieldValidationConfig> = {
  vendor: {
    required: true,
    minConfidence: 0.7,
    formatExamples: ['Home Depot', 'McDonald\'s', 'ABC Company Inc.'],
    suggestions: COMMON_VENDORS
  },
  amount: {
    required: true,
    minConfidence: 0.8,
    formatExamples: ['$12.50', '$1,234.56', '$0.99']
  },
  date: {
    required: true,
    minConfidence: 0.7,
    formatExamples: ['2024-01-15', '01/15/2024', 'Today', 'Yesterday']
  },
  description: {
    required: false,
    formatExamples: ['Office supplies', 'Fuel for company vehicle', 'Building materials']
  }
};

/**
 * Validates vendor name with helpful feedback
 */
export function validateVendor(value: string, confidence?: number): ValidationResult {
  const trimmed = value.trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Vendor name is required',
      formatExample: 'Home Depot'
    };
  }

  // Check for very short names
  if (trimmed.length < 2) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Vendor name too short',
      suggestion: 'Enter the full business name',
      formatExample: 'Home Depot'
    };
  }

  // Check for suspicious characters
  const suspiciousChars = /[<>{}[\]\\|`~]/;
  if (suspiciousChars.test(trimmed)) {
    return {
      isValid: false,
      severity: 'warning',
      message: 'Vendor name contains unusual characters',
      suggestion: 'Remove special characters from business name'
    };
  }

  // Check for excessive length
  if (trimmed.length > 100) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Vendor name is very long',
      suggestion: 'Consider shortening to main business name'
    };
  }

  // Low confidence warning
  if (confidence !== undefined && confidence < 0.5) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Please verify vendor name is correct',
      suggestion: 'OCR confidence is low for this field'
    };
  }

  // All good
  return {
    isValid: true,
    severity: 'info',
    message: 'Vendor name looks good',
    formatExample: 'Home Depot'
  };
}

/**
 * Validates amount with helpful feedback
 */
export function validateAmount(value: number | string, confidence?: number): ValidationResult {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;
  
  if (isNaN(numValue) || numValue === 0) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Amount is required',
      formatExample: '$12.50'
    };
  }

  if (numValue < 0) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Amount cannot be negative',
      formatExample: '$12.50'
    };
  }

  // Check for unusually small amounts
  if (numValue < 0.01) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Amount must be at least $0.01',
      formatExample: '$0.50'
    };
  }

  // Check for unusually large amounts
  if (numValue > 50000) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'This is a large amount - please verify',
      suggestion: 'Double-check the receipt total'
    };
  }

  // Check for amounts that might be missing decimals
  if (numValue > 1000 && numValue % 1 === 0) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Large round number - verify decimal placement',
      suggestion: 'Should this be $' + (numValue / 100).toFixed(2) + '?'
    };
  }

  // Low confidence warning
  if (confidence !== undefined && confidence < 0.6) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Please verify amount is correct',
      suggestion: 'OCR confidence is low for this field'
    };
  }

  return {
    isValid: true,
    severity: 'info',
    message: 'Amount looks good',
    formatExample: '$12.50'
  };
}

/**
 * Validates date with helpful feedback
 */
export function validateDate(value: string, confidence?: number): ValidationResult {
  if (!value.trim()) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Date is required',
      formatExample: '2024-01-15'
    };
  }

  // Try to parse the date
  const date = new Date(value);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      severity: 'error',
      message: 'Invalid date format',
      suggestion: 'Use format: YYYY-MM-DD or MM/DD/YYYY',
      formatExample: '2024-01-15'
    };
  }

  // Check for future dates
  if (date > now) {
    const daysDiff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) {
      return {
        isValid: true,
        severity: 'warning',
        message: 'Date is in the future',
        suggestion: 'Verify this is the correct receipt date'
      };
    }
  }

  // Check for very old dates
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (date < oneYearAgo) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Date is over a year old',
      suggestion: 'Verify this is the correct receipt date'
    };
  }

  // Check for weekend dates (might be unusual for some businesses)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isValid: true,
      severity: 'info',
      message: 'Weekend date - verify if needed',
      formatExample: '2024-01-15'
    };
  }

  // Low confidence warning
  if (confidence !== undefined && confidence < 0.5) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Please verify date is correct',
      suggestion: 'OCR confidence is low for this field'
    };
  }

  return {
    isValid: true,
    severity: 'info',
    message: 'Date looks good',
    formatExample: '2024-01-15'
  };
}

/**
 * Validates description with helpful feedback
 */
export function validateDescription(value: string): ValidationResult {
  const trimmed = value.trim();
  
  // Description is optional, so empty is fine
  if (!trimmed) {
    return {
      isValid: true,
      severity: 'info',
      message: 'Description is optional',
      formatExample: 'Office supplies'
    };
  }

  // Check for excessive length
  if (trimmed.length > 500) {
    return {
      isValid: true,
      severity: 'warning',
      message: 'Description is very long',
      suggestion: 'Consider shortening to key details'
    };
  }

  // Check for potential PII or sensitive information
  const sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: true,
        severity: 'warning',
        message: 'Description may contain sensitive information',
        suggestion: 'Remove personal or financial details'
      };
    }
  }

  return {
    isValid: true,
    severity: 'info',
    message: 'Description looks good',
    formatExample: 'Office supplies'
  };
}

/**
 * Main validation function that routes to appropriate validator
 */
export function validateField(
  fieldType: FieldType,
  value: any,
  confidence?: number
): ValidationResult {
  switch (fieldType) {
    case 'vendor':
      return validateVendor(value, confidence);
    case 'amount':
      return validateAmount(value, confidence);
    case 'date':
      return validateDate(value, confidence);
    case 'description':
      return validateDescription(value);
    default:
      return {
        isValid: true,
        severity: 'info',
        message: 'Field validation not configured'
      };
  }
}

/**
 * Get format examples for a field type
 */
export function getFormatExamples(fieldType: FieldType): string[] {
  return FIELD_CONFIGS[fieldType]?.formatExamples || [];
}

/**
 * Get suggestions for a field type
 */
export function getFieldSuggestions(fieldType: FieldType, value?: string): string[] {
  const config = FIELD_CONFIGS[fieldType];
  if (!config.suggestions) return [];

  if (!value) return config.suggestions.slice(0, 5);

  // Filter suggestions based on current value
  const filtered = config.suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(value.toLowerCase())
  );

  return filtered.slice(0, 5);
}

/**
 * Determines if a field needs attention based on confidence
 */
export function shouldHighlightField(confidence?: number): boolean {
  return confidence !== undefined && confidence < 0.7;
}

/**
 * Gets the confidence-based highlight color
 */
export function getConfidenceHighlight(confidence?: number): string {
  if (confidence === undefined) return '';
  
  if (confidence < 0.5) return 'border-destructive/50 bg-destructive/5';
  if (confidence < 0.7) return 'border-warning/50 bg-warning/5';
  if (confidence > 0.9) return 'border-success/50 bg-success/5';
  
  return '';
}