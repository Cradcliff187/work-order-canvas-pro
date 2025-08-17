// Amount parsing - SIMPLIFIED VERSION
export function parseAmounts(text) {
  console.log('💰 Looking for amounts in receipt...');
  
  // Fix decimal points that might be missing
  const fixedText = text.replace(/(\d{2,})(\d{2})\b/g, (match, dollars, cents) => {
    // If it looks like dollars and cents without a decimal
    if (parseInt(dollars) < 10000 && parseInt(cents) < 100) {
      return `${dollars}.${cents}`;
    }
    return match;
  });
  
  // Look for TOTAL patterns
  const totalPatterns = [
    /TOTAL\s+\$?([\d,]+\.?\d*)/i,
    /TOTAL[\s:]*\$?([\d,]+\.?\d*)/i,
    /GRAND\s*TOTAL[\s:]*\$?([\d,]+\.?\d*)/i,
    /AMOUNT\s*DUE[\s:]*\$?([\d,]+\.?\d*)/i,
    /BALANCE\s*DUE[\s:]*\$?([\d,]+\.?\d*)/i,
    /TOTAL.*?(\d+\.\d{2})/i,
    /(\d+\.\d{2}).*?TOTAL/i
  ];
  
  let foundAmounts = [];
  
  // Try each pattern
  for (const pattern of totalPatterns) {
    const matches = fixedText.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      
      // Validate amount
      if (amount > 0 && amount < 100000) {
        console.log(`[AMOUNT] Found: $${amount} with pattern: ${pattern.source}`);
        foundAmounts.push(amount);
      }
    }
  }
  
  // If no explicit total found, look for all amounts
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] No TOTAL found, looking for all amounts...');
    
    // Find all money amounts
    const allAmountPatterns = [
      /\$\s*(\d+\.?\d*)/g,
      /(\d+\.\d{2})/g,
      /(\d{2,4})\s*(?=\n|$)/g  // Numbers at end of lines
    ];
    
    let allAmounts = [];
    for (const pattern of allAmountPatterns) {
      const matches = fixedText.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0.01 && amount < 100000) {
          // Get context
          const start = Math.max(0, match.index - 20);
          const end = Math.min(fixedText.length, match.index + 20);
          const context = fixedText.substring(start, end).toLowerCase();
          
          allAmounts.push({
            amount,
            hasTotal: /total|due|balance/i.test(context),
            position: match.index / fixedText.length  // Position in document
          });
        }
      }
    }
    
    // Sort by relevance
    allAmounts.sort((a, b) => {
      // Prefer amounts with "total" nearby
      if (a.hasTotal && !b.hasTotal) return -1;
      if (!a.hasTotal && b.hasTotal) return 1;
      // Prefer amounts near the end
      if (b.position - a.position > 0.2) return 1;
      // Prefer larger amounts
      return b.amount - a.amount;
    });
    
    console.log(`[AMOUNT] Found ${allAmounts.length} amounts`);
    if (allAmounts.length > 0) {
      console.log(`[AMOUNT] Top 3:`, allAmounts.slice(0, 3).map(a => `$${a.amount}`));
      foundAmounts.push(allAmounts[0].amount);
    }
  }
  
  // Check for amounts that might be missing decimal points
  if (foundAmounts.length > 0) {
    foundAmounts = foundAmounts.map(amount => {
      // If amount looks too big, might be missing decimal
      if (amount > 1000 && amount % 100 < 100) {
        const fixed = amount / 100;
        console.log(`[AMOUNT] Fixing decimal: ${amount} -> ${fixed}`);
        return fixed;
      }
      return amount;
    });
  }
  
  // Return the best total
  const bestTotal = foundAmounts.length > 0 ? Math.max(...foundAmounts) : undefined;
  
  if (bestTotal) {
    console.log(`[AMOUNT] ✅ Final total: $${bestTotal}`);
  } else {
    console.log(`[AMOUNT] ❌ No total found`);
  }
  
  return {
    total: bestTotal,
    grandTotal: bestTotal,
    confidence: bestTotal ? 0.9 : 0.1
  };
}
