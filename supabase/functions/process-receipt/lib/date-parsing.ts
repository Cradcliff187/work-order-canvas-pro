// Date parsing functionality

interface DateResult {
  date: string | null;
  confidence: number;
  format: string;
}

interface DatePattern {
  regex: RegExp;
  format: string;
  confidence: number;
  parser: (match: RegExpMatchArray) => { month: number; day: number; year: number; isAmbiguous: boolean };
}

export function parseReceiptDate(text: string): DateResult {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const currentYear = new Date().getFullYear();
  
  // Comprehensive date patterns with format identification
  const datePatterns: DatePattern[] = [
    // US Format patterns (MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY)
    {
      regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
      format: 'US_FULL',
      confidence: 0.9,
      parser: (match: RegExpMatchArray) => {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        return { month, day, year, isAmbiguous: month <= 12 && day <= 12 };
      }
    },
    // US Format 2-digit year (MM/DD/YY)
    {
      regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})\b/g,
      format: 'US_SHORT',
      confidence: 0.8,
      parser: (match: RegExpMatchArray) => {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        const fullYear = year >= 30 ? 1900 + year : 2000 + year;
        return { month, day, year: fullYear, isAmbiguous: month <= 12 && day <= 12 };
      }
    },
    // ISO Format (YYYY-MM-DD, YYYY.MM.DD)
    {
      regex: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g,
      format: 'ISO',
      confidence: 0.95,
      parser: (match: RegExpMatchArray) => {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        return { month, day, year, isAmbiguous: false };
      }
    },
    // European Format (DD/MM/YYYY)
    {
      regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
      format: 'EU_FULL',
      confidence: 0.7, // Lower confidence due to ambiguity with US format
      parser: (match: RegExpMatchArray) => {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);
        return { month, day, year, isAmbiguous: day <= 12 && month <= 12 };
      }
    },
    // Month name formats (Jan 15, 2024 or January 15, 2024 or 15 Jan 2024)
    {
      regex: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
      format: 'MONTH_NAME_LONG',
      confidence: 0.95,
      parser: (match: RegExpMatchArray) => {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthStr = match[1].toLowerCase().slice(0, 3);
        const month = monthNames.indexOf(monthStr) + 1;
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        return { month, day, year, isAmbiguous: false };
      }
    },
    // Reverse month name format (15 Jan 2024)
    {
      regex: /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/gi,
      format: 'DAY_MONTH_NAME',
      confidence: 0.9,
      parser: (match: RegExpMatchArray) => {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthStr = match[2].toLowerCase().slice(0, 3);
        const month = monthNames.indexOf(monthStr) + 1;
        const day = parseInt(match[1]);
        const year = parseInt(match[3]);
        return { month, day, year, isAmbiguous: false };
      }
    },
    // Compact formats (MMDDYYYY, DDMMYYYY)
    {
      regex: /\b(\d{2})(\d{2})(\d{4})\b/g,
      format: 'COMPACT',
      confidence: 0.6,
      parser: (match: RegExpMatchArray) => {
        const first = parseInt(match[1]);
        const second = parseInt(match[2]);
        const year = parseInt(match[3]);
        // Assume US format if ambiguous
        return { month: first, day: second, year, isAmbiguous: first <= 12 && second <= 12 };
      }
    }
  ];
  
  let bestDateMatch: DateResult = { date: null, confidence: 0, format: '' };
  const foundDates: Array<{ date: Date; confidence: number; format: string; raw: string }> = [];
  
  // Search in first 10 lines (dates are usually at the top)
  const searchLines = lines.slice(0, 10);
  const searchText = searchLines.join('\n');
  
  for (const pattern of datePatterns) {
    pattern.regex.lastIndex = 0; // Reset regex state
    let match;
    
    while ((match = pattern.regex.exec(searchText)) !== null) {
      try {
        const parsed = pattern.parser(match);
        
        // Validate the parsed date
        if (parsed.month >= 1 && parsed.month <= 12 && 
            parsed.day >= 1 && parsed.day <= 31 && 
            parsed.year >= 1900 && parsed.year <= currentYear + 1) {
          
          const dateObj = new Date(parsed.year, parsed.month - 1, parsed.day);
          
          // Verify the date is valid (e.g., not Feb 31)
          if (dateObj.getFullYear() === parsed.year && 
              dateObj.getMonth() === parsed.month - 1 && 
              dateObj.getDate() === parsed.day) {
            
            let confidence = pattern.confidence;
            
            // Apply confidence adjustments
            if (parsed.isAmbiguous) confidence *= 0.9;
            if (parsed.year === currentYear) confidence *= 1.05; // Slight boost for current year
            if (Math.abs(parsed.year - currentYear) > 5) confidence *= 0.8; // Reduce for very old dates
            
            // Format the date as YYYY-MM-DD
            const formattedDate = `${parsed.year}-${parsed.month.toString().padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`;
            
            foundDates.push({
              date: dateObj,
              confidence: Math.min(confidence, 0.98),
              format: pattern.format,
              raw: match[0]
            });
          }
        }
      } catch (error) {
        console.warn(`Date parsing error for pattern ${pattern.format}:`, error);
      }
    }
  }
  
  // Find the best date match
  if (foundDates.length > 0) {
    // Sort by confidence and recency (prefer more recent dates if confidence is similar)
    foundDates.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) < 0.1) {
        // If confidence is similar, prefer more recent dates
        return b.date.getTime() - a.date.getTime();
      }
      return confidenceDiff;
    });
    
    const bestMatch = foundDates[0];
    const year = bestMatch.date.getFullYear();
    const month = bestMatch.date.getMonth() + 1;
    const day = bestMatch.date.getDate();
    
    bestDateMatch = {
      date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      confidence: bestMatch.confidence,
      format: bestMatch.format
    };
    
    console.log(`Date found: ${bestDateMatch.date} (format: ${bestDateMatch.format}, confidence: ${bestDateMatch.confidence.toFixed(3)})`);
  }
  
  // Fallback: Try to extract any 4-digit year
  if (!bestDateMatch.date) {
    const yearMatch = searchText.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 1900 && year <= currentYear + 1) {
        // Use January 1st as fallback
        bestDateMatch = {
          date: `${year}-01-01`,
          confidence: 0.3,
          format: 'YEAR_ONLY'
        };
        console.log(`Fallback date from year: ${bestDateMatch.date}`);
      }
    }
  }
  
  return bestDateMatch;
}