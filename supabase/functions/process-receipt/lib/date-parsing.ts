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

export function parseReceiptDate(text: string): string {
  console.log('📅 Looking for date...');
  
  // Simple date patterns
  const datePatterns = [
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/,  // MM/DD/YYYY
    /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/,  // YYYY-MM-DD
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/i  // Jan 15, 2024
  ];
  
  // Check first few lines for dates
  const lines = text.split('\n').slice(0, 5);
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        console.log(`Found date pattern in: ${line.trim()}`);
        
        // Try to format as YYYY-MM-DD
        if (pattern.source.includes('Jan|Feb')) {
          // Month name format
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames.indexOf(match[1]) + 1;
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else {
          // Numeric format - assume first match is valid
          const parts = match.slice(1, 4).map(p => parseInt(p));
          if (parts[0] > 31) {
            // YYYY-MM-DD format
            return `${parts[0]}-${parts[1].toString().padStart(2, '0')}-${parts[2].toString().padStart(2, '0')}`;
          } else {
            // MM/DD/YYYY format
            return `${parts[2]}-${parts[0].toString().padStart(2, '0')}-${parts[1].toString().padStart(2, '0')}`;
          }
        }
      }
    }
  }
  
  // Fallback: use today's date
  const today = new Date();
  const fallback = today.toISOString().split('T')[0];
  console.log(`No date found, using today: ${fallback}`);
  return fallback;
}