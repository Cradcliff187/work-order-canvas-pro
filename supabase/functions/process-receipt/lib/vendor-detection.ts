// Vendor detection - ROBUST VERSION for poor OCR
const VENDOR_ALIASES = {
  'Home Depot': [
    'HOME DEPOT', 'HOMEDEPOT', 'THE HOME DEPOT',
    'OME DEPOT', 'HOME DEPO', 'HOME DEP0T', // Common OCR errors
    'HOM DEPOT', 'HONE DEPOT', 'H0ME DEPOT'  // More OCR errors
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
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('[VENDOR] First 8 lines:');
  lines.slice(0, 8).forEach((line, i) => {
    console.log(`  ${i}: "${line}"`);
  });
  
  // FIRST: Check for vendor slogans (very reliable even with poor OCR)
  const fullText = text.toUpperCase();
  const first100Lines = lines.slice(0, 10).join(' ').toUpperCase();
  
  for (const [vendorName, slogans] of Object.entries(VENDOR_SLOGANS)) {
    for (const slogan of slogans) {
      const sloganUpper = slogan.toUpperCase();
      if (fullText.includes(sloganUpper) || first100Lines.includes(sloganUpper)) {
        console.log(`[VENDOR] ✅ Found by slogan: ${vendorName} (slogan: "${slogan}")`);
        return vendorName;
      }
      
      // Check for partial slogan matches (for OCR errors)
      const sloganWords = sloganUpper.split(' ').filter(w => w.length > 3);
      let matchedWords = 0;
      for (const word of sloganWords) {
        if (first100Lines.includes(word)) matchedWords++;
      }
      if (sloganWords.length > 0 && matchedWords / sloganWords.length >= 0.7) {
        console.log(`[VENDOR] ✅ Found by partial slogan: ${vendorName}`);
        return vendorName;
      }
    }
  }
  
  // Check for "OM" or "HOME" pattern specifically (common Home Depot OCR issue)
  if (lines.length >= 2) {
    const firstTwo = lines.slice(0, 2).join(' ').toUpperCase();
    if (firstTwo.includes('OM') || firstTwo.includes('HOME')) {
      // Check if next lines have "doers" or "done" (Home Depot slogan)
      const nextFew = lines.slice(0, 5).join(' ').toLowerCase();
      if (nextFew.includes('doer') || nextFew.includes('done') || nextFew.includes('doing')) {
        console.log('[VENDOR] ✅ Found Home Depot by OM/HOME + slogan pattern');
        return 'Home Depot';
      }
    }
  }
  
  // Check if first 3 lines combine to form known vendor
  if (lines.length >= 3) {
    const firstThreeJoined = lines.slice(0, 3).join(' ').toUpperCase();
    const firstThreeConcat = lines.slice(0, 3).join('').toUpperCase();
    
    // Special handling for HOME DEPOT with OCR errors
    if (firstThreeJoined.includes('OM') && firstThreeJoined.includes('DEP')) {
      console.log('[VENDOR] ✅ Found Home Depot with OCR errors (OM + DEP)');
      return 'Home Depot';
    }
    
    for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
      for (const alias of aliases) {
        if (firstThreeJoined.includes(alias) || firstThreeConcat.includes(alias)) {
          console.log(`[VENDOR] ✅ Found ${vendorName} in first 3 lines`);
          return vendorName;
        }
        
        // Fuzzy match for OCR errors
        if (calculateSimilarity(firstThreeJoined, alias) > 0.7) {
          console.log(`[VENDOR] ✅ Found ${vendorName} with fuzzy match`);
          return vendorName;
        }
      }
    }
  }
  
  // Check two-line combinations
  for (let i = 0; i < Math.min(4, lines.length - 1); i++) {
    const combined = `${lines[i]} ${lines[i + 1]}`.toUpperCase();
    
    for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
      for (const alias of aliases) {
        if (combined.includes(alias)) {
          console.log(`[VENDOR] ✅ Found ${vendorName} in lines ${i}-${i+1}`);
          return vendorName;
        }
        
        // Fuzzy match
        if (calculateSimilarity(combined, alias) > 0.75) {
          console.log(`[VENDOR] ✅ Found ${vendorName} with fuzzy match in lines ${i}-${i+1}`);
          return vendorName;
        }
      }
    }
  }
  
  // Check individual lines with fuzzy matching
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lineUpper = lines[i].toUpperCase();
    
    // Direct check
    for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
      for (const alias of aliases) {
        if (lineUpper.includes(alias)) {
          console.log(`[VENDOR] ✅ Found ${vendorName}: "${lines[i]}"`);
          return vendorName;
        }
        
        // Fuzzy match for single lines
        if (calculateSimilarity(lineUpper, alias) > 0.8) {
          console.log(`[VENDOR] ✅ Found ${vendorName} with fuzzy match: "${lines[i]}"`);
          return vendorName;
        }
      }
    }
  }
  
  // Special case: if we see "OM" in first line, likely HOME with bad OCR
  if (lines[0] && lines[0].toUpperCase() === 'OM') {
    console.log('[VENDOR] Found "OM" - likely HOME DEPOT with bad OCR');
    return 'Home Depot';
  }
  
  // Fallback
  for (const line of lines.slice(0, 5)) {
    if (line.length < 2) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[\$\d\.\s]+$/.test(line)) continue;
    if (/\d{1,2}[\/\-]\d{1,2}/.test(line)) continue;
    
    console.log(`[VENDOR] Using fallback: "${line}"`);
    return line;
  }
  
  return 'Unknown Vendor';
}
