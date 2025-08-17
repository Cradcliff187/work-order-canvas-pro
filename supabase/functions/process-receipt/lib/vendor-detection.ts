// Vendor detection and normalization functionality

type ExtractionMethod = 'direct_ocr' | 'pattern_match' | 'fuzzy_match' | 'calculated' | 'inferred' | 'fallback';

interface VendorResult {
  vendor: string;
  vendor_raw: string;
  confidence: number;
  method: ExtractionMethod;
  source: string;
  position: number;
}

// Vendor normalization map
const VENDOR_ALIASES: Record<string, string[]> = {
  'Home Depot': ['HD', 'HOME DEPOT', 'HOMEDEPOT', 'THE HOME DEPOT', 'HOME\\s*DEPOT'],
  'Lowes': ['LOWES', 'LOWE\'S', 'LOWE S', 'LOWES HOME IMPROVEMENT'],
  'Walmart': ['WALMART', 'WAL-MART', 'WAL MART', 'WMT', 'WALMART SUPERCENTER'],
  'Target': ['TARGET', 'TGT', 'TARGET CORP'],
  'Costco': ['COSTCO', 'COSTCO WHOLESALE'],
  'Sams Club': ['SAM\'S CLUB', 'SAMS CLUB', 'SAMSCLUB'],
  'Harbor Freight': ['HARBOR FREIGHT', 'HARBOR FREIGHT TOOLS', 'HF', 'HARBORFREIGHT'],
  'Ace Hardware': ['ACE HARDWARE', 'ACE', 'ACE HDW'],
  'Menards': ['MENARDS', 'MENARD\'S'],
  'Best Buy': ['BEST BUY', 'BESTBUY'],
  'CVS': ['CVS', 'CVS PHARMACY', 'CVS/PHARMACY'],
  'Walgreens': ['WALGREENS', 'WALGREEN'],
  'Kroger': ['KROGER', 'KROGER CO'],
  'Safeway': ['SAFEWAY'],
  'Whole Foods': ['WHOLE FOODS', 'WHOLEFOODS', 'WHOLE FOODS MARKET'],
  'Dollar General': ['DOLLAR GENERAL', 'DG', 'DOLLARGENERAL'],
  'Dollar Tree': ['DOLLAR TREE', 'DOLLARTREE'],
  'RadioShack': ['RADIOSHACK', 'RADIO SHACK'],
  'H-E-B': ['HEB', 'H-E-B', 'H E B'],
  'Tractor Supply': ['TRACTOR SUPPLY', 'TSC', 'TRACTORSUPPLY']
};

export function normalizeVendorText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^\w\s-']/g, ' ') // Remove special chars except hyphens and apostrophes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Early return for same strings
  if (str1 === str2) return 0;
  
  // Early return for empty strings
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // Early termination for very different lengths (optimization)
  if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.3) {
    return Math.max(len1, len2);
  }
  
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

export function findVendor(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Simple approach: check first 3 lines for known vendors
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = normalizeVendorText(lines[i]);
    
    // Check against known vendors
    for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
      for (const alias of aliases) {
        if (line.includes(alias.replace(/\s/g, ''))) {
          console.log(`Found vendor: ${vendorName} in line: ${lines[i]}`);
          return vendorName;
        }
      }
    }
  }
  
  // Fallback: return first line if it's not empty
  return lines.length > 0 ? lines[0] : '';
}