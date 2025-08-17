// Amount parsing - SIMPLIFIED AND DEBUGGED VERSION
export function parseAmounts(text: string) {
  console.log('💰 Looking for amounts in receipt...');
  console.log('[AMOUNT] Full text to analyze:', text.substring(0, 500) + '...');
  
  let foundAmounts: number[] = [];
  
  // Pattern 1: TOTAL followed directly by amount on same line
  const totalSameLinePattern = /\bTOTAL\s*\$?\s*(\d+\.?\d*)/gi;
  const sameLineMatches = [...text.matchAll(totalSameLinePattern)];
  
  console.log(`[AMOUNT] Same line pattern found ${sameLineMatches.length} matches`);
  sameLineMatches.forEach((match, i) => {
    const amount = parseFloat(match[1]);
    console.log(`[AMOUNT] Same line match ${i + 1}: "${match[0]}" -> $${amount}`);
    if (amount > 0 && amount < 100000) {
      foundAmounts.push(amount);
    }
  });
  
  // Pattern 2: TOTAL on its own line, then amount on next few lines
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] No same-line matches, looking for separated TOTAL...');
    
    const lines = text.split('\n');
    let totalLineIndex = -1;
    
    // Find line with just "TOTAL" (not SUBTOTAL)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`[AMOUNT] Line ${i}: "${line}"`);
      
      if (/^\s*TOTAL\s*$/i.test(line)) {
        totalLineIndex = i;
        console.log(`[AMOUNT] ✅ Found TOTAL on line ${i}`);
        break;
      }
    }
    
    // Look for amount in next few lines
    if (totalLineIndex >= 0) {
      for (let i = totalLineIndex + 1; i < Math.min(totalLineIndex + 4, lines.length); i++) {
        const line = lines[i].trim();
        console.log(`[AMOUNT] Checking line ${i} after TOTAL: "${line}"`);
        
        const amountMatch = line.match(/^\$?\s*(\d+\.\d{2})$/);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1]);
          console.log(`[AMOUNT] ✅ Found amount after TOTAL: $${amount}`);
          if (amount > 0 && amount < 100000) {
            foundAmounts.push(amount);
            break;
          }
        }
      }
    }
  }
  
  // If still no amounts found, try fallback patterns
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] No direct matches, trying fallback patterns...');
    
    const fallbackPatterns = [
      /GRAND\s*TOTAL[\s:]*\$?\s*(\d+\.\d{2})/gi,
      /AMOUNT\s*DUE[\s:]*\$?\s*(\d+\.\d{2})/gi,
      /BALANCE\s*DUE[\s:]*\$?\s*(\d+\.\d{2})/gi,
    ];
    
    for (const pattern of fallbackPatterns) {
      const matches = [...text.matchAll(pattern)];
      matches.forEach((match, i) => {
        const amount = parseFloat(match[1]);
        console.log(`[AMOUNT] Fallback match: "${match[0]}" -> $${amount}`);
        if (amount > 0 && amount < 100000) {
          foundAmounts.push(amount);
        }
      });
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