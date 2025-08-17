// Amount parsing functionality for totals, subtotals, and tax

interface AmountResult {
  subtotal?: number;
  tax?: number;
  total?: number;
  total_confidence?: number;
}

// Helper function to preprocess OCR text for better matching
function preprocessOCRText(text: string): string {
  return text
    // Fix common OCR character substitutions
    .replace(/[O0]/g, match => match) // Keep both O and 0, context will determine
    .replace(/[Il1]/g, match => match) // Keep variations, let patterns handle
    // Normalize spacing around currency and numbers
    .replace(/\$\s*(\d)/g, '$$$1')
    .replace(/(\d)\s*\$/, '$1$')
    // Fix common spacing issues around keywords
    .replace(/t\s*o\s*t\s*a\s*l/gi, 'total')
    .replace(/s\s*u\s*b\s*t\s*o\s*t\s*a\s*l/gi, 'subtotal')
    .replace(/t\s*a\s*x/gi, 'tax');
}

// Function to extract all monetary amounts from text for fallback detection
function extractAllAmounts(text: string): Array<{amount: number, position: number, context: string}> {
  const amounts: Array<{amount: number, position: number, context: string}> = [];
  
  // Enhanced patterns to catch all monetary amounts
  const amountPatterns = [
    /\$(\d{1,6}(?:\.\d{2})?)/g,
    /(\d{1,6}(?:\.\d{2})?)\s*\$/g,
    /\b(\d{1,6}\.\d{2})\b/g,
    /\b(\d{2,6})\b/g // Whole dollar amounts over $10
  ];
  
  for (const pattern of amountPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1]);
      if (amount >= 0.01 && amount < 999999) {
        // Get context around the amount (30 chars before and after)
        const start = Math.max(0, match.index - 30);
        const end = Math.min(text.length, match.index + match[0].length + 30);
        const context = text.substring(start, end);
        
        amounts.push({
          amount,
          position: match.index,
          context: context.replace(/\n/g, ' ').trim()
        });
      }
    }
  }
  
  // Remove duplicates and sort by position
  const uniqueAmounts = amounts.filter((amount, index, arr) => 
    arr.findIndex(a => Math.abs(a.amount - amount.amount) < 0.01 && 
                      Math.abs(a.position - amount.position) < 10) === index
  );
  
  return uniqueAmounts.sort((a, b) => a.position - b.position);
}

export function parseAmounts(text: string): AmountResult {
  const preprocessedText = preprocessOCRText(text);
  const lines = preprocessedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const amounts: AmountResult = {};
  
  console.log('🔍 Processing text for amounts:', { 
    originalLength: text.length,
    processedLength: preprocessedText.length,
    lineCount: lines.length
  });
  
  // Enhanced total patterns with OCR-friendly variations
  const totalPatterns = [
    // High confidence exact matches
    { regex: /\bfinal\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.98, field: 'total' },
    { regex: /\bgrand\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.98, field: 'total' },
    { regex: /\btotal\s*amount\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.96, field: 'total' },
    { regex: /\bamount\s*due\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'total' },
    { regex: /\btotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.93, field: 'total' },
    
    // OCR-friendly variations (handles spacing and character issues)
    { regex: /\bt[o0]tal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.90, field: 'total' },
    { regex: /\bt[o0]t\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.85, field: 'total' },
    { regex: /\bttal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.80, field: 'total' },
    { regex: /\bto[lt]al\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.80, field: 'total' },
    
    // Currency symbol patterns
    { regex: /\btotal\s*[\$€£¥](\d{1,6}(?:\.\d{2})?)/i, confidence: 0.92, field: 'total' },
    { regex: /[\$€£¥]\s*(\d{1,6}(?:\.\d{2})?)\s*total/i, confidence: 0.88, field: 'total' },
    { regex: /\btotal\s*\$?(\d{1,6}(?:\.\d{2})?)\s*$/i, confidence: 0.90, field: 'total' },
    { regex: /^total\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.90, field: 'total' },
    
    // Payment and transaction patterns
    { regex: /\btender\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.85, field: 'total' },
    { regex: /\bpayment\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.82, field: 'total' },
    { regex: /\bcharge\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.80, field: 'total' },
    { regex: /\bamount\s*paid\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.78, field: 'total' },
    
    // Format variations with separators and OCR artifacts
    { regex: /total[\s\-\.\:=]+\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.85, field: 'total' },
    { regex: /tot[\s\-\.\:=]+\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.80, field: 'total' },
    { regex: /\btot\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.75, field: 'total' },
    
    // End-of-line total patterns (common in receipts)
    { regex: /(\d{1,6}(?:\.\d{2})?)\s*total/i, confidence: 0.70, field: 'total' },
    { regex: /total\s*(\d{1,6}(?:\.\d{2})?)$/i, confidence: 0.75, field: 'total' },
    
    // Subtotal patterns
    { regex: /\bsubtotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.92, field: 'subtotal' },
    { regex: /\bsub[\s\-]*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.90, field: 'subtotal' },
    { regex: /\bmerchandise\s*subtotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'subtotal' },
    { regex: /\bitem\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.88, field: 'subtotal' },
    
    // Tax patterns
    { regex: /\bsales\s*tax\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.95, field: 'tax' },
    { regex: /\btotal\s*tax\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.93, field: 'tax' },
    { regex: /\btax\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.90, field: 'tax' },
    { regex: /\bvat\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.88, field: 'tax' },
    { regex: /\b(?:gst|hst)\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i, confidence: 0.85, field: 'tax' }
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
  
  console.log('📊 Pattern matching results:', {
    bestTotal: { amount: bestTotal.amount, confidence: bestTotal.confidence },
    bestSubtotal: { amount: bestSubtotal.amount, confidence: bestSubtotal.confidence },
    bestTax: { amount: bestTax.amount, confidence: bestTax.confidence }
  });

  // Set results if confidence is sufficient
  if (bestTotal.confidence >= 0.5) {
    amounts.total = bestTotal.amount;
    amounts.total_confidence = bestTotal.confidence;
    console.log('✅ Found total via pattern matching:', bestTotal.amount);
  }
  
  if (bestSubtotal.confidence >= 0.5) {
    amounts.subtotal = bestSubtotal.amount;
    console.log('✅ Found subtotal:', bestSubtotal.amount);
  }
  
  if (bestTax.confidence >= 0.5) {
    amounts.tax = bestTax.amount;
    console.log('✅ Found tax:', bestTax.amount);
  }

  // Fallback: If no total found via patterns, use heuristic detection
  if (!amounts.total) {
    console.log('🔄 No total found via patterns, trying fallback detection...');
    const allAmounts = extractAllAmounts(preprocessedText);
    console.log('💰 All detected amounts:', allAmounts.map(a => `$${a.amount} (${a.context})`));
    
    if (allAmounts.length > 0) {
      // Heuristic 1: Look for largest amount in the last 30% of the text
      const textLength = preprocessedText.length;
      const lastThirdStart = textLength * 0.7;
      const lateAmounts = allAmounts.filter(a => a.position >= lastThirdStart);
      
      if (lateAmounts.length > 0) {
        const largestLateAmount = lateAmounts.reduce((max, current) => 
          current.amount > max.amount ? current : max
        );
        amounts.total = largestLateAmount.amount;
        amounts.total_confidence = 0.6; // Lower confidence for heuristic
        console.log('🎯 Found total via heuristic (largest late amount):', largestLateAmount.amount);
      } else {
        // Heuristic 2: Use the largest amount overall (with lower confidence)
        const largestAmount = allAmounts.reduce((max, current) => 
          current.amount > max.amount ? current : max
        );
        amounts.total = largestAmount.amount;
        amounts.total_confidence = 0.4; // Even lower confidence
        console.log('🎯 Found total via heuristic (largest overall):', largestAmount.amount);
      }
    }
  }
  
  // Validate mathematical consistency
  if (amounts.subtotal && amounts.tax && amounts.total) {
    const calculatedTotal = amounts.subtotal + amounts.tax;
    const difference = Math.abs(calculatedTotal - amounts.total);
    
    console.log('🧮 Math validation:', {
      subtotal: amounts.subtotal,
      tax: amounts.tax,
      total: amounts.total,
      calculated: calculatedTotal,
      difference
    });
    
    if (difference <= 0.02) {
      // Math checks out - boost confidence
      amounts.total_confidence = Math.min((amounts.total_confidence || 0) * 1.1, 0.98);
      console.log('✅ Math validation passed - boosted confidence');
    } else if (difference > 1.0) {
      // Significant discrepancy - reduce confidence
      amounts.total_confidence = Math.max((amounts.total_confidence || 0) * 0.8, 0.3);
      console.log('⚠️ Math validation failed - reduced confidence');
    }
  }
  
  console.log('💰 Final amounts extracted:', amounts);
  return amounts;
}