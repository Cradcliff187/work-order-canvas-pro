// Vendor detection - ROBUST VERSION for poor OCR
const VENDOR_ALIASES = {
  'Home Depot': [
    'HOME DEPOT', 'THE HOME DEPOT', 'HOMEDEPOT', 'HD', 'DEPOT',
    // Enhanced OCR error patterns for Home Depot specifically
    'HO DEPOT', 'HOME DEP0T', 'H0ME DEP0T', 'HOM DEPOT', 'HOME DEPT',
    'HO\nDEPOT', 'H0\nDEP0T', 'THE H0ME DEPOT', 'HONE DEPOT', 'HOWE DEPOT',
    'HOME DEP', 'H DEPOT', 'HOME D', 'THE HD', 'HDEPOT', 'OME DEPOT',
    'HOME DEPO', 'OM DEPOT'  // For multi-line cases like "HO\nDEPOT"
  ],
  'Lowes': ['LOWES', "LOWE'S", 'LOWE S', 'L0WES'],
  'Walmart': ['WALMART', 'WAL-MART', 'WAL MART', 'WALM4RT'],
  'Target': ['TARGET', 'TGT', 'TARG3T'],
  'Costco': ['COSTCO', 'COSTCO WHOLESALE', 'C0STCO'],
  'CVS': ['CVS', 'CVS PHARMACY'],
  'Walgreens': ['WALGREENS', 'WALGREEN']
};

// Vendor slogans and unique identifiers
const VENDOR_SLOGANS = {
  'Home Depot': [
    'How doers get more done',
    'More saving. More doing',
    'doers get more done',
    'More saving',
    'More doing'
  ],
  'Walmart': [
    'Save money. Live better',
    'Always Low Prices',
    'Everyday Low Prices'
  ],
  'Target': [
    'Expect More. Pay Less',
    'Run & Done'
  ]
};

export function normalizeVendorText(text) {
  return text.toUpperCase().replace(/[^\w\s-']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function calculateSimilarity(str1, str2) {
  const s1 = str1.toUpperCase();
  const s2 = str2.toUpperCase();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Check character-by-character similarity
  let matches = 0;
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / Math.max(s1.length, s2.length);
}

export function levenshteinDistance(str1, str2) {
  if (str1 === str2) return 0;
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[len1][len2];
}

export function findVendor(text) {
  console.log('🏪 Looking for vendor in receipt...');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const normalizedText = normalizeVendorText(text);
  
  console.log('[VENDOR] First 8 lines:');
  lines.slice(0, 8).forEach((line, i) => {
    console.log(`  ${i}: "${line}"`);
  });
  
  // Priority 1: Check for vendor slogans (most reliable)
  for (const [vendor, slogans] of Object.entries(VENDOR_SLOGANS)) {
    for (const slogan of slogans) {
      if (normalizedText.includes(normalizeVendorText(slogan))) {
        console.log(`[VENDOR] ✅ Found by slogan: ${vendor} ("${slogan}")`);
        return { name: vendor, confidence: 0.95 };
      }
    }
  }
  
  // Priority 2: Enhanced multi-line vendor detection (for "HO\nDEPOT" cases)
  const multiLineText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const multiLineNormalized = normalizeVendorText(multiLineText);
  
  for (const [vendor, aliases] of Object.entries(VENDOR_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeVendorText(alias);
      if (multiLineNormalized.includes(normalizedAlias)) {
        console.log(`[VENDOR] ✅ Found multi-line match: ${vendor} ("${alias}")`);
        return { name: vendor, confidence: 0.9 };
      }
    }
  }

  // Priority 3: Fallback to first non-empty line as vendor name
  for (const line of lines.slice(0, 5)) {
    if (line.length < 2) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[\$\d\.\s]+$/.test(line)) continue;
    if (/\d{1,2}[\/\-]\d{1,2}/.test(line)) continue;
    
    console.log(`[VENDOR] Using fallback: "${line}"`);
    return { name: line, confidence: 0.3 };
  }
  
  return { name: 'Unknown Vendor', confidence: 0.1 };
}
