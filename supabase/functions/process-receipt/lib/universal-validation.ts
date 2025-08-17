// Universal validation and error recovery for OCR processing

export interface ValidationRule {
  name: string;
  priority: number;
  validate: (data: any) => ValidationResult;
  autoFix?: (data: any) => any;
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  currentValue: any;
  suggestedValue?: any;
  autoFixable: boolean;
}

export interface ValidationContext {
  documentType: string;
  vendor?: string;
  currency: string;
  locale: string;
}

// Core validation rules
const AMOUNT_VALIDATION: ValidationRule = {
  name: 'amount_validation',
  priority: 100,
  validate: (data) => {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;
    
    // Check total amount
    if (data.total !== undefined) {
      if (typeof data.total !== 'number' || data.total <= 0) {
        issues.push({
          type: 'error',
          field: 'total',
          message: 'Total amount must be a positive number',
          currentValue: data.total,
          autoFixable: false
        });
        confidence *= 0.3;
      } else if (data.total > 100000) {
        issues.push({
          type: 'warning',
          field: 'total',
          message: 'Total amount seems unusually high',
          currentValue: data.total,
          autoFixable: false
        });
        confidence *= 0.8;
      }
    }
    
    // Mathematical consistency check
    if (data.subtotal && data.tax && data.total) {
      const calculatedTotal = data.subtotal + data.tax;
      const difference = Math.abs(calculatedTotal - data.total);
      
      if (difference > 0.02) {
        issues.push({
          type: 'error',
          field: 'total',
          message: `Total (${data.total}) doesn't match subtotal + tax (${calculatedTotal})`,
          currentValue: data.total,
          suggestedValue: calculatedTotal,
          autoFixable: true
        });
        confidence *= 0.5;
      }
    }
    
    // Tax rate validation
    if (data.subtotal && data.tax) {
      const taxRate = data.tax / data.subtotal;
      if (taxRate > 0.15) { // Over 15% tax seems high
        issues.push({
          type: 'warning',
          field: 'tax',
          message: `Tax rate (${(taxRate * 100).toFixed(1)}%) seems unusually high`,
          currentValue: data.tax,
          autoFixable: false
        });
        confidence *= 0.9;
      }
    }
    
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      confidence,
      issues,
      suggestions: generateAmountSuggestions(data, issues)
    };
  },
  autoFix: (data) => {
    // Auto-fix mathematical inconsistencies
    if (data.subtotal && data.tax && data.total) {
      const calculatedTotal = data.subtotal + data.tax;
      const difference = Math.abs(calculatedTotal - data.total);
      
      if (difference > 0.02) {
        console.log(`🔧 Auto-fixing total: ${data.total} → ${calculatedTotal}`);
        data.total = calculatedTotal;
        data.total_confidence = Math.min((data.total_confidence || 0.8) * 1.1, 0.95);
      }
    }
    
    return data;
  }
};

const DATE_VALIDATION: ValidationRule = {
  name: 'date_validation',
  priority: 90,
  validate: (data) => {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;
    
    if (data.date) {
      const date = new Date(data.date);
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        issues.push({
          type: 'error',
          field: 'date',
          message: 'Invalid date format',
          currentValue: data.date,
          autoFixable: false
        });
        confidence *= 0.3;
      }
      // Check if date is in the future
      else if (daysDiff < 0) {
        issues.push({
          type: 'warning',
          field: 'date',
          message: 'Date is in the future',
          currentValue: data.date,
          suggestedValue: now.toISOString().split('T')[0],
          autoFixable: true
        });
        confidence *= 0.7;
      }
      // Check if date is too old (over 5 years)
      else if (daysDiff > 1825) {
        issues.push({
          type: 'warning',
          field: 'date',
          message: 'Date is over 5 years old',
          currentValue: data.date,
          autoFixable: false
        });
        confidence *= 0.8;
      }
    }
    
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      confidence,
      issues,
      suggestions: generateDateSuggestions(data, issues)
    };
  },
  autoFix: (data) => {
    if (data.date) {
      const date = new Date(data.date);
      const now = new Date();
      
      // Fix future dates
      if (date > now) {
        console.log(`🔧 Auto-fixing future date: ${data.date} → ${now.toISOString().split('T')[0]}`);
        data.date = now.toISOString().split('T')[0];
        data.date_confidence = 0.6;
      }
    }
    
    return data;
  }
};

const VENDOR_VALIDATION: ValidationRule = {
  name: 'vendor_validation',
  priority: 80,
  validate: (data) => {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;
    
    if (data.vendor) {
      // Check vendor name length
      if (data.vendor.length < 2) {
        issues.push({
          type: 'error',
          field: 'vendor',
          message: 'Vendor name too short',
          currentValue: data.vendor,
          autoFixable: false
        });
        confidence *= 0.3;
      } else if (data.vendor.length > 50) {
        issues.push({
          type: 'warning',
          field: 'vendor',
          message: 'Vendor name unusually long',
          currentValue: data.vendor,
          autoFixable: false
        });
        confidence *= 0.8;
      }
      
      // Check for suspicious characters
      if (/[^\w\s&'\-\.]/g.test(data.vendor)) {
        issues.push({
          type: 'warning',
          field: 'vendor',
          message: 'Vendor name contains unusual characters',
          currentValue: data.vendor,
          autoFixable: false
        });
        confidence *= 0.7;
      }
      
      // Check if vendor is all numbers (likely OCR error)
      if (/^\d+$/.test(data.vendor)) {
        issues.push({
          type: 'error',
          field: 'vendor',
          message: 'Vendor name appears to be numbers only',
          currentValue: data.vendor,
          autoFixable: false
        });
        confidence *= 0.2;
      }
    }
    
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      confidence,
      issues,
      suggestions: generateVendorSuggestions(data, issues)
    };
  }
};

const LINE_ITEMS_VALIDATION: ValidationRule = {
  name: 'line_items_validation',
  priority: 70,
  validate: (data) => {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;
    
    if (data.lineItems && Array.isArray(data.lineItems)) {
      for (let i = 0; i < data.lineItems.length; i++) {
        const item = data.lineItems[i];
        
        // Check if item has description
        if (!item.description || item.description.length < 3) {
          issues.push({
            type: 'warning',
            field: `lineItems[${i}].description`,
            message: 'Line item description too short',
            currentValue: item.description,
            autoFixable: false
          });
          confidence *= 0.9;
        }
        
        // Check price reasonableness
        if (item.totalPrice && (item.totalPrice <= 0 || item.totalPrice > 10000)) {
          issues.push({
            type: 'warning',
            field: `lineItems[${i}].totalPrice`,
            message: 'Line item price seems unrealistic',
            currentValue: item.totalPrice,
            autoFixable: false
          });
          confidence *= 0.8;
        }
        
        // Check quantity vs price consistency
        if (item.quantity && item.unitPrice && item.totalPrice) {
          const calculatedTotal = item.quantity * item.unitPrice;
          if (Math.abs(calculatedTotal - item.totalPrice) > 0.02) {
            issues.push({
              type: 'error',
              field: `lineItems[${i}].totalPrice`,
              message: 'Line item total doesn\'t match quantity × unit price',
              currentValue: item.totalPrice,
              suggestedValue: calculatedTotal,
              autoFixable: true
            });
            confidence *= 0.7;
          }
        }
      }
    }
    
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      confidence,
      issues,
      suggestions: generateLineItemsSuggestions(data, issues)
    };
  },
  autoFix: (data) => {
    if (data.lineItems && Array.isArray(data.lineItems)) {
      for (const item of data.lineItems) {
        // Fix quantity × unit price = total price
        if (item.quantity && item.unitPrice && item.totalPrice) {
          const calculatedTotal = item.quantity * item.unitPrice;
          if (Math.abs(calculatedTotal - item.totalPrice) > 0.02) {
            console.log(`🔧 Auto-fixing line item total: ${item.totalPrice} → ${calculatedTotal}`);
            item.totalPrice = calculatedTotal;
          }
        }
      }
    }
    
    return data;
  }
};

// All validation rules
const VALIDATION_RULES: ValidationRule[] = [
  AMOUNT_VALIDATION,
  DATE_VALIDATION,
  VENDOR_VALIDATION,
  LINE_ITEMS_VALIDATION
];

export function runUniversalValidation(data: any, context: ValidationContext = {
  documentType: 'receipt',
  currency: 'USD',
  locale: 'en-US'
}): ValidationResult {
  console.log('🔍 Running comprehensive universal validation...');
  
  const allIssues: ValidationIssue[] = [];
  const confidenceScores: number[] = [];
  const suggestions: string[] = [];
  
  // Run all validation rules with enhanced error handling
  for (const rule of VALIDATION_RULES) {
    try {
      const result = rule.validate(data);
      allIssues.push(...result.issues);
      confidenceScores.push(result.confidence);
      suggestions.push(...result.suggestions);
      
      console.log(`✅ ${rule.name}: ${result.issues.length} issues, confidence ${result.confidence.toFixed(3)}`);
    } catch (error) {
      console.warn(`⚠️ Validation rule ${rule.name} failed: ${error.message}`);
      allIssues.push({
        type: 'error',
        field: 'validation_system',
        message: `Validation rule ${rule.name} failed: ${error.message}`,
        currentValue: null,
        autoFixable: false
      });
      confidenceScores.push(0.3); // Low confidence for failed validation
    }
  }
  
  // Enhanced confidence calculation with mathematical validation penalties
  let overallConfidence = confidenceScores.length > 0 
    ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
    : 0;
  
  // Apply mathematical validation penalties
  const mathIssues = allIssues.filter(i => i.message.includes('match') || i.message.includes('total'));
  if (mathIssues.length > 0) {
    overallConfidence *= (1 - mathIssues.length * 0.1); // 10% penalty per math issue
    console.log(`📉 Applied mathematical validation penalty: ${mathIssues.length} issues`);
  }
  
  // Flag for manual review if confidence is too low
  const needsManualReview = overallConfidence < 0.6 || allIssues.filter(i => i.type === 'error').length > 2;
  if (needsManualReview) {
    allIssues.push({
      type: 'warning',
      field: 'overall_confidence',
      message: 'Low confidence extraction - recommend manual review',
      currentValue: overallConfidence,
      autoFixable: false
    });
    suggestions.push('Consider manual review for low-confidence extractions');
  }
  
  const errorCount = allIssues.filter(issue => issue.type === 'error').length;
  const warningCount = allIssues.filter(issue => issue.type === 'warning').length;
  
  console.log(`🔍 Comprehensive validation complete: ${errorCount} errors, ${warningCount} warnings, confidence: ${overallConfidence.toFixed(3)}`);
  if (needsManualReview) {
    console.log('🚨 Flagged for manual review due to low confidence');
  }
  
  return {
    valid: errorCount === 0,
    confidence: Math.max(overallConfidence, 0.05), // Minimum confidence floor
    issues: allIssues,
    suggestions: [...new Set(suggestions)] // Remove duplicates
  };
}

export function runAutoFix(data: any): any {
  console.log('🔧 Running auto-fix procedures...');
  
  let fixedData = { ...data };
  let fixCount = 0;
  
  for (const rule of VALIDATION_RULES) {
    if (rule.autoFix) {
      const beforeHash = JSON.stringify(fixedData);
      fixedData = rule.autoFix(fixedData);
      const afterHash = JSON.stringify(fixedData);
      
      if (beforeHash !== afterHash) {
        fixCount++;
        console.log(`🔧 Applied auto-fix: ${rule.name}`);
      }
    }
  }
  
  console.log(`🔧 Auto-fix complete: ${fixCount} fixes applied`);
  return fixedData;
}

// Error recovery strategies
export function recoverFromErrors(data: any, issues: ValidationIssue[]): any {
  const recoveredData = { ...data };
  
  for (const issue of issues) {
    if (issue.type === 'error' && issue.suggestedValue !== undefined) {
      // Apply suggested value
      const fieldPath = issue.field.split('.');
      let current = recoveredData;
      
      for (let i = 0; i < fieldPath.length - 1; i++) {
        const key = fieldPath[i];
        if (!(key in current)) current[key] = {};
        current = current[key];
      }
      
      const finalKey = fieldPath[fieldPath.length - 1];
      current[finalKey] = issue.suggestedValue;
      
      console.log(`🔄 Applied error recovery: ${issue.field} = ${issue.suggestedValue}`);
    }
  }
  
  return recoveredData;
}

// Suggestion generators
function generateAmountSuggestions(data: any, issues: ValidationIssue[]): string[] {
  const suggestions: string[] = [];
  
  if (issues.some(i => i.field === 'total' && i.message.includes("doesn't match"))) {
    suggestions.push('Consider using the calculated total from subtotal + tax');
  }
  
  if (data.total && data.total > 1000) {
    suggestions.push('Verify large amounts for accuracy');
  }
  
  return suggestions;
}

function generateDateSuggestions(data: any, issues: ValidationIssue[]): string[] {
  const suggestions: string[] = [];
  
  if (issues.some(i => i.field === 'date' && i.message.includes('future'))) {
    suggestions.push('Use today\'s date if receipt date is unclear');
  }
  
  if (issues.some(i => i.field === 'date' && i.message.includes('old'))) {
    suggestions.push('Verify date format and OCR accuracy for old receipts');
  }
  
  return suggestions;
}

function generateVendorSuggestions(data: any, issues: ValidationIssue[]): string[] {
  const suggestions: string[] = [];
  
  if (issues.some(i => i.field === 'vendor' && i.message.includes('numbers only'))) {
    suggestions.push('Check top lines of receipt for vendor name');
  }
  
  if (issues.some(i => i.field === 'vendor' && i.message.includes('unusual characters'))) {
    suggestions.push('Clean vendor name of OCR artifacts');
  }
  
  return suggestions;
}

function generateLineItemsSuggestions(data: any, issues: ValidationIssue[]): string[] {
  const suggestions: string[] = [];
  
  if (issues.some(i => i.field.includes('lineItems') && i.message.includes('total'))) {
    suggestions.push('Verify line item calculations');
  }
  
  if (issues.some(i => i.field.includes('lineItems') && i.message.includes('price'))) {
    suggestions.push('Check for OCR errors in prices');
  }
  
  return suggestions;
}

// Confidence boosting for high-quality extractions
export function boostConfidenceForQuality(data: any, textQuality: string): any {
  const boostedData = { ...data };
  
  if (textQuality === 'excellent') {
    boostedData.total_confidence = Math.min((boostedData.total_confidence || 0.8) * 1.2, 0.98);
    boostedData.vendor_confidence = Math.min((boostedData.vendor_confidence || 0.8) * 1.1, 0.98);
    boostedData.date_confidence = Math.min((boostedData.date_confidence || 0.8) * 1.1, 0.98);
  } else if (textQuality === 'good') {
    boostedData.total_confidence = Math.min((boostedData.total_confidence || 0.8) * 1.1, 0.95);
    boostedData.vendor_confidence = Math.min((boostedData.vendor_confidence || 0.8) * 1.05, 0.95);
  }
  
  return boostedData;
}