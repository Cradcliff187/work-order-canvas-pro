// Enhanced amount parsing with improved multi-line TOTAL detection
export function parseAmounts(text: string) {
  console.log('💰 Looking for amounts in receipt...');
  
  // Normalize text for better pattern matching
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Enhanced decimal point fixing - handle amounts like 79117 -> 791.17
  const fixedText = text.replace(/(\d{3,})\b/g, (match) => {
    const num = parseInt(match);
    // If it's a large number without decimal, likely missing decimal point
    if (num > 999 && num < 100000 && !match.includes('.')) {
      const withDecimal = (num / 100).toFixed(2);
      console.log(`[AMOUNT] Fixed decimal: ${match} -> ${withDecimal}`);
      return withDecimal;
    }
    return match;
  });
  
  // Priority 1: Multi-line TOTAL patterns (most reliable)
  const multiLineTotalPatterns = [
    // TOTAL on one line, amount on next line(s) - enhanced for Home Depot format
    /\bTOTAL\s*\n\s*\$?\s*(\d+\.?\d*)/i,
    /\bTOTAL\s*\n.*?\n\s*\$?\s*(\d+\.\d{2})/i,
    /\bTOTAL\s*\$?\s*(\d+\.\d{2})/i,
    // Handle cases where TOTAL and amount are separated by other text
    /\bTOTAL\b[^S\d]*\$?\s*(\d+\.\d{2})/i
  ];
  
  for (const pattern of multiLineTotalPatterns) {
    const match = fixedText.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > 0 && amount < 100000) {
        // Verify this isn't from SUBTOTAL context
        const matchIndex = fixedText.indexOf(match[0]);
        const beforeMatch = fixedText.substring(Math.max(0, matchIndex - 20), matchIndex);
        
        if (!/SUBTOTAL/i.test(beforeMatch)) {
          console.log(`[AMOUNT] ✅ Found multi-line TOTAL: $${amount}`);
          return {
            total: amount,
            grandTotal: amount,
            confidence: 0.95
          };
        }
      }
    }
  }
  
  // Priority 2: Standard TOTAL patterns with context awareness
  const totalPatterns = [
    /GRAND\s*TOTAL[\s:]*\$?\s*(\d+\.\d{2})/i,
    /AMOUNT\s*DUE[\s:]*\$?\s*(\d+\.\d{2})/i,
    /BALANCE\s*DUE[\s:]*\$?\s*(\d+\.\d{2})/i,
    /\bTOTAL\b(?!\s*SUB)[\s:$]*(\d+\.\d{2})/i,  // TOTAL but not followed by SUB
    /FINAL\s*TOTAL[\s:]*\$?\s*(\d+\.\d{2})/i
  ];
  
  let foundAmounts: Array<{amount: number, confidence: number, context: string}> = [];
  
  // Try each pattern with context scoring
  for (const pattern of totalPatterns) {
    const matches = fixedText.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      
      if (amount > 0 && amount < 100000) {
        const matchIndex = match.index || 0;
        const context = fixedText.substring(Math.max(0, matchIndex - 30), matchIndex + 30);
        
        // Score based on context quality
        let confidence = 0.7;
        if (/GRAND\s*TOTAL/i.test(context)) confidence = 0.9;
        if (/AMOUNT\s*DUE/i.test(context)) confidence = 0.85;
        if (!/SUBTOTAL/i.test(context)) confidence += 0.1;
        
        foundAmounts.push({amount, confidence, context});
        console.log(`[AMOUNT] Found: $${amount} (confidence: ${confidence})`);
      }
    }
  }
  
  // Priority 3: Line-by-line TOTAL scanning with better pattern detection
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] Scanning line-by-line for TOTAL patterns...');
    
    const lines = fixedText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for standalone TOTAL line
      if (/^TOTAL\s*$/i.test(line)) {
        console.log(`[AMOUNT] Found standalone TOTAL on line ${i}`);
        
        // Check next few lines for amounts
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          const amountMatch = nextLine.match(/^\$?\s*(\d+\.\d{2})\s*$/);
          
          if (amountMatch) {
            const amount = parseFloat(amountMatch[1]);
            if (amount > 0 && amount < 100000) {
              console.log(`[AMOUNT] Found amount after standalone TOTAL: $${amount}`);
              foundAmounts.push({amount, confidence: 0.9, context: `Line ${i}-${j}: TOTAL -> ${amount}`});
              break;
            }
          }
        }
      }
      
      // Look for TOTAL with amount on same line (fallback)
      const sameLine = line.match(/TOTAL\s*\$?\s*(\d+\.\d{2})/i);
      if (sameLine && !/SUBTOTAL/i.test(line)) {
        const amount = parseFloat(sameLine[1]);
        if (amount > 0 && amount < 100000) {
          foundAmounts.push({amount, confidence: 0.8, context: `Same line: ${line}`});
        }
      }
    }
  }
  
  // Priority 4: Fallback to all amounts with smart filtering
  if (foundAmounts.length === 0) {
    console.log('[AMOUNT] No TOTAL patterns found, analyzing all amounts...');
    
    const allAmountPatterns = [
      /\$\s*(\d+\.\d{2})/g,
      /(\d+\.\d{2})\s*$/gm,  // Amounts at end of line
      /(\d{2,4}\.\d{2})/g    // Any decimal amounts
    ];
    
    let allAmounts: Array<{amount: number, score: number, context: string, position: number}> = [];
    
    for (const pattern of allAmountPatterns) {
      const matches = fixedText.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0.01 && amount < 100000) {
          const matchIndex = match.index || 0;
          const contextStart = Math.max(0, matchIndex - 40);
          const contextEnd = Math.min(fixedText.length, matchIndex + 40);
          const context = fixedText.substring(contextStart, contextEnd);
          
          // Score amounts based on context and position
          let score = 0;
          if (/\btotal\b/i.test(context) && !/subtotal/i.test(context)) score += 50;
          if (/\$/.test(match[0])) score += 10; // Has dollar sign
          if (matchIndex > fixedText.length * 0.6) score += 20; // Appears later in text
          if (/\b(due|owed|pay|amount)\b/i.test(context)) score += 15;
          
          // Penalize if near subtotal, tax, etc.
          if (/subtotal|tax|discount/i.test(context)) score -= 30;
          
          allAmounts.push({
            amount,
            score,
            context: context.replace(/\s+/g, ' ').trim(),
            position: matchIndex / fixedText.length
          });
        }
      }
    }
    
    // Sort by score (highest first)
    allAmounts.sort((a, b) => b.score - a.score);
    
    console.log(`[AMOUNT] Found ${allAmounts.length} candidate amounts`);
    if (allAmounts.length > 0) {
      const topAmounts = allAmounts.slice(0, 3);
      console.log(`[AMOUNT] Top candidates:`, topAmounts.map(a => `$${a.amount} (score: ${a.score})`));
      
      foundAmounts.push({
        amount: topAmounts[0].amount,
        confidence: Math.min(0.7, topAmounts[0].score / 100),
        context: topAmounts[0].context
      });
    }
  }
  
  // Select best amount based on confidence and validation
  if (foundAmounts.length > 0) {
    // Sort by confidence, then by amount (larger amounts preferred for totals)
    foundAmounts.sort((a, b) => {
      const confDiff = b.confidence - a.confidence;
      if (Math.abs(confDiff) < 0.1) {
        return b.amount - a.amount; // Prefer larger amounts when confidence is similar
      }
      return confDiff;
    });
    
    const bestMatch = foundAmounts[0];
    console.log(`[AMOUNT] ✅ Final total: $${bestMatch.amount} (confidence: ${bestMatch.confidence})`);
    console.log(`[AMOUNT] Context: ${bestMatch.context}`);
    
    return {
      total: bestMatch.amount,
      grandTotal: bestMatch.amount,
      confidence: bestMatch.confidence
    };
  }
  
  console.log(`[AMOUNT] ❌ No total found`);
  return {
    total: undefined,
    grandTotal: undefined,
    confidence: 0.1
  };
}