// Amount parsing - FIXED VERSION for separated TOTAL
export function parseAmounts(text: string) {
  console.log('💰 Looking for amounts in receipt...');
  
  // Fix decimal points that might be missing
  const fixedText = text.replace(/(\d{2,})(\d{2})\b/g, (match, dollars, cents) => {
    if (parseInt(dollars) < 10000 && parseInt(cents) < 100) {
      return `${dollars}.${cents}`;
    }
    return match;
  });
  
  // Special handling for TOTAL on its own line
  // Look for pattern where TOTAL is alone, then amount appears later
  const separatedTotalPattern = /\bTOTAL\s*\n(?:.*\n){0,4}.*?\$?\s*(\d+\.\d{2})/i;
  const separatedMatch = fixedText.match(separatedTotalPattern);
  
  if (separatedMatch) {
    // Make sure we're not getting SUBTOTAL's amount
    const amountStr = separatedMatch[1];
    const amount = parseFloat(amountStr);
    
    // Check if this amount appears AFTER the word TOTAL (not as part of SUBTOTAL)
    const totalIndex = fixedText.indexOf('TOTAL');
    const subtotalIndex = fixedText.indexOf('SUBTOTAL');
    const amountIndex = fixedText.indexOf(amountStr);
    
    // Only use this amount if it appears after TOTAL and not as part of SUBTOTAL
    if (totalIndex > -1 && amountIndex > totalIndex && 
        (subtotalIndex === -1 || amountIndex > subtotalIndex + 20)) {
      console.log(`[AMOUNT] Found separated TOTAL: $${amount}`);
      return {
        total: amount,
        grandTotal: amount,
        confidence: 0.95
      };
    }
  }
  
  // Look for TOTAL patterns (existing logic)
  const totalPatterns = [
    // Look for TOTAL followed by amount within next few lines
    /\bTOTAL\b[^S][\s\S]{0,30}\$?\s*(\d+\.\d{2})/i,  // TOTAL (not SUBTOTAL) then amount
    /TOTAL\s+\$?([\d,]+\.?\d*)/i,
    /TOTAL[\s:]*\$?([\d,]+\.?\d*)/i,
    /GRAND\s*TOTAL[\s:]*\$?([\d,]+\.?\d*)/i,
    /AMOUNT\s*DUE[\s:]*\$?([\d,]+\.?\d*)/i,
    /BALANCE\s*DUE[\s:]*\$?([\d,]+\.?\d*)/i,
    // Skip these patterns as they can match SUBTOTAL
    // /TOTAL.*?(\d+\.\d{2})/i,
    // /(\d+\.\d{2}).*?TOTAL/i
  ];
  
  let foundAmounts: number[] = [];
  
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
  
  // Additional logic: Look for amounts after the word TOTAL specifically
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] Looking for amounts after TOTAL keyword...');
    
    // Find where TOTAL appears (not SUBTOTAL)
    const lines = fixedText.split('\n');
    let totalLineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*TOTAL\s*$/i.test(lines[i])) {
        totalLineIndex = i;
        console.log(`[AMOUNT] Found TOTAL on line ${i}: "${lines[i]}"`);
        break;
      }
    }
    
    // If we found TOTAL on its own line, look for amounts in next few lines
    if (totalLineIndex >= 0) {
      for (let i = totalLineIndex + 1; i < Math.min(totalLineIndex + 6, lines.length); i++) {
        const amountMatch = lines[i].match(/\$?\s*(\d+\.\d{2})/);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1]);
          if (amount > 0 && amount < 100000) {
            console.log(`[AMOUNT] Found amount after TOTAL line: $${amount} on line ${i}`);
            foundAmounts.push(amount);
            break; // Take first amount after TOTAL
          }
        }
      }
    }
  }
  
  // If still no total found, fall back to looking for all amounts
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] No TOTAL found, looking for all amounts...');
    
    const allAmountPatterns = [
      /\$\s*(\d+\.?\d*)/g,
      /(\d+\.\d{2})/g,
      /(\d{2,4})\s*(?=\n|$)/g
    ];
    
    let allAmounts: Array<{ amount: number; hasTotal: boolean; position: number }> = [];
    for (const pattern of allAmountPatterns) {
      const matches = fixedText.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0.01 && amount < 100000) {
          const start = Math.max(0, (match.index || 0) - 20);
          const end = Math.min(fixedText.length, (match.index || 0) + 20);
          const context = fixedText.substring(start, end).toLowerCase();
          
          allAmounts.push({
            amount,
            hasTotal: /\btotal\b(?!.*sub)/i.test(context), // TOTAL but not SUBTOTAL
            position: (match.index || 0) / fixedText.length
          });
        }
      }
    }
    
    // Sort by relevance
    allAmounts.sort((a, b) => {
      if (a.hasTotal && !b.hasTotal) return -1;
      if (!a.hasTotal && b.hasTotal) return 1;
      if (b.position - a.position > 0.2) return 1;
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
      if (amount > 1000 && amount % 100 < 100) {
        const fixed = amount / 100;
        console.log(`[AMOUNT] Fixing decimal: ${amount} -> ${fixed}`);
        return fixed;
      }
      return amount;
    });
  }
  
  // Return the best total (prefer larger amounts as they're usually the total)
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