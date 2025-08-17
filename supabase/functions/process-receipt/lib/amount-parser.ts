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
  console.log('🔍 Looking for total amount...');
  
  // Simple patterns for finding totals
  const totalPatterns = [
    /\btotal\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i,
    /\bgrand\s*total\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i,
    /\bamount\s*due\s*:?\s*\$?(\d{1,6}(?:\.\d{2})?)/i,
    /[\$](\d{1,6}(?:\.\d{2})?)\s*total/i
  ];
  
  const lines = text.split('\n');
  let bestTotal = 0;
  
  // Look for total in each line
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount > bestTotal && amount < 999999) {
          bestTotal = amount;
          console.log(`Found total: $${amount} in line: ${line.trim()}`);
        }
      }
    }
  }
  
  // Fallback: find largest dollar amount
  if (!bestTotal) {
    const allAmounts = text.match(/\$(\d{1,6}(?:\.\d{2})?)/g);
    if (allAmounts) {
      bestTotal = Math.max(...allAmounts.map(a => parseFloat(a.replace('$', ''))));
      console.log(`Fallback: using largest amount $${bestTotal}`);
    }
  }
  
  return { 
    total: bestTotal || undefined,
    grandTotal: bestTotal || undefined 
  };
}