// Date parsing for receipts - FIXED VERSION
export function parseReceiptDate(text) {
  console.log('[DATE] Looking for date in receipt...');
  
  // Common date patterns found on receipts
  const datePatterns = [
    // MM/DD/YY or MM/DD/YYYY
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
    // MM-DD-YY or MM-DD-YYYY
    /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/g,
    // DD/MM/YY or DD/MM/YYYY (European format)
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
    // YYYY-MM-DD
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
    // Month DD, YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi,
    // DD Month YYYY
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\b/gi
  ];
  
  let foundDates = [];
  
  // Try each pattern
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let dateStr = null;
      let year, month, day;
      
      // Parse based on pattern
      if (pattern.source.includes('\\d{4}-\\d{1,2}-\\d{1,2}')) {
        // YYYY-MM-DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else if (pattern.source.includes('Jan|Feb')) {
        // Month name formats
        const monthNames = {
          'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
          'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        };
        
        if (match[1] && isNaN(match[1])) {
          // Month DD, YYYY
          month = monthNames[match[1].toLowerCase().substring(0, 3)];
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else {
          // DD Month YYYY
          day = parseInt(match[1]);
          month = monthNames[match[2].toLowerCase().substring(0, 3)];
          year = parseInt(match[3]);
        }
      } else {
        // MM/DD/YY or MM-DD-YY formats (US format assumed)
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
        
        // Handle 2-digit years
        if (year < 100) {
          // Assume 20xx for years 00-30, 19xx for years 31-99
          year = year <= 30 ? 2000 + year : 1900 + year;
        }
      }
      
      // Validate the date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        // Check if it's not a time (like 06:44) misinterpreted as date
        const contextStart = Math.max(0, match.index - 10);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 10);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        
        // Skip if it looks like a time (has AM/PM nearby or is preceded/followed by time indicators)
        if (context.includes('am') || context.includes('pm') || context.includes(':')) {
          // Check if this is actually a time like "06:44 PM"
          if (match[0].includes(':') || (month > 12 || day > 31)) {
            console.log(`[DATE] Skipping time value: ${match[0]}`);
            continue;
          }
        }
        
        // Format as YYYY-MM-DD
        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        foundDates.push({
          date: dateStr,
          original: match[0],
          position: match.index,
          confidence: 1.0
        });
        
        console.log(`[DATE] Found date: ${match[0]} -> ${dateStr}`);
      }
    }
  }
  
  // Remove duplicates and sort by position (prefer earlier dates in document)
  const uniqueDates = foundDates.filter((date, index, arr) =>
    arr.findIndex(d => d.date === date.date) === index
  );
  
  // Sort by position (dates appearing earlier are usually the transaction date)
  uniqueDates.sort((a, b) => a.position - b.position);
  
  if (uniqueDates.length > 0) {
    // Prefer dates that are not in the future
    const today = new Date();
    const validDates = uniqueDates.filter(d => {
      const date = new Date(d.date);
      return date <= today;
    });
    
    const bestDate = validDates.length > 0 ? validDates[0] : uniqueDates[0];
    console.log(`[DATE] ✅ Best date: ${bestDate.date} (from "${bestDate.original}")`);
    return bestDate.date;
  }
  
  // Fallback to today's date if no valid date found
  const today = new Date();
  const fallbackDate = today.toISOString().split('T')[0];
  console.log(`[DATE] ❌ No valid date found, using today: ${fallbackDate}`);
  return fallbackDate;
}
