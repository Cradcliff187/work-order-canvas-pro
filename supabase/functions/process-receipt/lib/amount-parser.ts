// Amount parsing functionality for totals, subtotals, and tax

interface AmountResult {
  subtotal?: number;
  tax?: number;
  total?: number;
  total_confidence?: number;
}

export function parseAmounts(text: string): AmountResult {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const amounts: AmountResult = {};
  
  // Enhanced total patterns - more comprehensive coverage
  const totalPatterns = [
    // Standard patterns
    { regex: /\btotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'total' },
    { regex: /\bfinal\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.98, field: 'total' },
    { regex: /\bgrand\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.98, field: 'total' },
    { regex: /\bamount\s*due\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.9, field: 'total' },
    { regex: /\btotal\s*amount\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'total' },
    
    // Universal patterns for various receipt formats
    { regex: /\btotal\s*\$?(\d{1,6}(?:\.\d{2})?)\s*$/i, confidence: 0.9, field: 'total' },
    { regex: /^total\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.9, field: 'total' },
    { regex: /\$(\d{1,6}(?:\.\d{2})?)\s*total/i, confidence: 0.85, field: 'total' },
    
    // Retail specific patterns
    { regex: /\btender\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.8, field: 'total' },
    { regex: /\bpayment\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.75, field: 'total' },
    { regex: /\bcharge\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.7, field: 'total' },
    
    // Format variations
    { regex: /total[\s\-\.\:]*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.85, field: 'total' },
    { regex: /tot[\s\-\.\:]*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.8, field: 'total' },
    
    // Subtotal patterns
    { regex: /\bsubtotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.9, field: 'subtotal' },
    { regex: /\bsub\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.9, field: 'subtotal' },
    { regex: /\bmerchandise\s*subtotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'subtotal' },
    
    // Tax patterns
    { regex: /\btax\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.9, field: 'tax' },
    { regex: /\bsales\s*tax\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'tax' },
    { regex: /\btotal\s*tax\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'tax' }
  ];
  
  let bestTotal = { amount: 0, confidence: 0 };
  let bestSubtotal = { amount: 0, confidence: 0 };
  let bestTax = { amount: 0, confidence: 0 };
  
  // Search through all lines for amount patterns
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const amount = parseFloat(match[1]);
        
        // Validate amount is reasonable
        if (amount > 0 && amount < 999999) {
          const confidence = pattern.confidence;
          
          // Apply position-based confidence boost (amounts at end are more likely to be totals)
          const lineIndex = lines.indexOf(line);
          const positionBoost = lineIndex > lines.length * 0.7 ? 1.1 : 1.0;
          const adjustedConfidence = Math.min(confidence * positionBoost, 0.98);
          
          if (pattern.field === 'total' && adjustedConfidence > bestTotal.confidence) {
            bestTotal = { amount, confidence: adjustedConfidence };
          } else if (pattern.field === 'subtotal' && adjustedConfidence > bestSubtotal.confidence) {
            bestSubtotal = { amount, confidence: adjustedConfidence };
          } else if (pattern.field === 'tax' && adjustedConfidence > bestTax.confidence) {
            bestTax = { amount, confidence: adjustedConfidence };
          }
        }
      }
    }
  }
  
  // Set results if confidence is sufficient
  if (bestTotal.confidence >= 0.5) {
    amounts.total = bestTotal.amount;
    amounts.total_confidence = bestTotal.confidence;
  }
  
  if (bestSubtotal.confidence >= 0.5) {
    amounts.subtotal = bestSubtotal.amount;
  }
  
  if (bestTax.confidence >= 0.5) {
    amounts.tax = bestTax.amount;
  }
  
  // Validate mathematical consistency
  if (amounts.subtotal && amounts.tax && amounts.total) {
    const calculatedTotal = amounts.subtotal + amounts.tax;
    const difference = Math.abs(calculatedTotal - amounts.total);
    
    if (difference <= 0.02) {
      // Math checks out - boost confidence
      amounts.total_confidence = Math.min((amounts.total_confidence || 0) * 1.1, 0.98);
    } else if (difference > 1.0) {
      // Significant discrepancy - reduce confidence
      amounts.total_confidence = Math.max((amounts.total_confidence || 0) * 0.8, 0.3);
    }
  }
  
  return amounts;
}