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

export function findVendor(text: string): VendorResult {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const fullTextNormalized = normalizeVendorText(text);
  
  let bestMatch = { vendor: '', vendor_raw: '', confidence: 0, method: 'direct_ocr' as ExtractionMethod, source: '', position: -1 };
  
  // Phase 1: Exact matching
  for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
    for (const alias of aliases) {
      const aliasRegex = new RegExp(alias.replace(/\s/g, '\\s*'), 'gi');
      
      // Check full text first
      const fullTextMatch = fullTextNormalized.match(aliasRegex);
      if (fullTextMatch) {
        const confidence = alias === vendorName ? 0.95 : 0.85;
        if (confidence > bestMatch.confidence) {
          bestMatch = { 
            vendor: vendorName, 
            vendor_raw: fullTextMatch[0], 
            confidence,
            method: 'pattern_match' as ExtractionMethod,
            source: fullTextMatch[0],
            position: 0
          };
        }
      }
      
      // Check first 5 lines for better accuracy
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const lineNormalized = normalizeVendorText(lines[i]);
        const lineMatch = lineNormalized.match(aliasRegex);
        if (lineMatch) {
          const confidence = alias === vendorName ? 0.9 : 0.8;
          if (confidence > bestMatch.confidence) {
            bestMatch = { 
              vendor: vendorName, 
              vendor_raw: lines[i], 
              confidence,
              method: 'pattern_match' as ExtractionMethod,
              source: lines[i],
              position: i
            };
          }
        }
      }
    }
  }
  
  // Handle special case for Home Depot multi-line pattern (HO\nDEPOT)
  const homeDepotMultiline = /HO\s*\n\s*DEPOT/i;
  if (homeDepotMultiline.test(text)) {
    const match = text.match(homeDepotMultiline);
    if (match && 0.9 > bestMatch.confidence) {
      bestMatch = { 
        vendor: 'Home Depot', 
        vendor_raw: match[0], 
        confidence: 0.9,
        method: 'pattern_match' as ExtractionMethod,
        source: match[0],
        position: 0
      };
    }
  }
  
  // Phase 2: Fuzzy matching (only if no good exact match found)
  if (bestMatch.confidence < 0.8) {
    console.log('Attempting fuzzy vendor matching...');
    
    // Prepare text candidates for fuzzy matching
    const textCandidates: string[] = [];
    
    // Add first 5 lines as candidates
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const normalized = normalizeVendorText(lines[i]);
      if (normalized.length >= 3) { // Only consider meaningful text
        textCandidates.push(normalized);
      }
    }
    
    // Add words from full text (for partial vendor names)
    const words = fullTextNormalized.split(/\s+/).filter(word => word.length >= 3);
    textCandidates.push(...words.slice(0, 10)); // Limit to first 10 words
    
    let bestFuzzyMatch = { vendor: '', vendor_raw: '', confidence: 0, similarity: 0 };
    
    // Test each candidate against all vendors and aliases
    for (const candidate of textCandidates) {
      for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
        // Check against vendor name
        const vendorSimilarity = calculateSimilarity(candidate, normalizeVendorText(vendorName));
        if (vendorSimilarity >= 0.8) {
          const confidence = 0.65 + (vendorSimilarity - 0.8) * 0.15; // Scale 0.8-1.0 similarity to 0.65-0.8 confidence
          if (confidence > bestFuzzyMatch.confidence) {
            bestFuzzyMatch = {
              vendor: vendorName,
              vendor_raw: candidate,
              confidence,
              similarity: vendorSimilarity
            };
          }
        }
        
        // Check against aliases
        for (const alias of aliases) {
          const aliasSimilarity = calculateSimilarity(candidate, normalizeVendorText(alias));
          if (aliasSimilarity >= 0.8) {
            const confidence = 0.6 + (aliasSimilarity - 0.8) * 0.15; // Scale 0.8-1.0 similarity to 0.6-0.75 confidence
            if (confidence > bestFuzzyMatch.confidence) {
              bestFuzzyMatch = {
                vendor: vendorName,
                vendor_raw: candidate,
                confidence,
                similarity: aliasSimilarity
              };
            }
          }
        }
      }
    }
    
    // Update best match if fuzzy match is better
    if (bestFuzzyMatch.confidence > bestMatch.confidence) {
      console.log(`Fuzzy match found: "${bestFuzzyMatch.vendor}" (similarity: ${bestFuzzyMatch.similarity.toFixed(3)}, confidence: ${bestFuzzyMatch.confidence.toFixed(3)})`);
      bestMatch = {
        vendor: bestFuzzyMatch.vendor,
        vendor_raw: bestFuzzyMatch.vendor_raw,
        confidence: bestFuzzyMatch.confidence,
        method: 'fuzzy_match' as ExtractionMethod,
        source: bestFuzzyMatch.vendor_raw,
        position: 0
      };
    }
  }
  
  return bestMatch;
}