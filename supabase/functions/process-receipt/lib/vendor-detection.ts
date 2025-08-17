// Vendor detection - SIMPLIFIED VERSION
const VENDOR_ALIASES = {
  'Home Depot': ['HOME DEPOT', 'HOMEDEPOT', 'THE HOME DEPOT'],
  'Lowes': ['LOWES', "LOWE'S", 'LOWE S'],
  'Walmart': ['WALMART', 'WAL-MART', 'WAL MART'],
  'Target': ['TARGET', 'TGT'],
  'Costco': ['COSTCO', 'COSTCO WHOLESALE'],
  'CVS': ['CVS', 'CVS PHARMACY'],
  'Walgreens': ['WALGREENS', 'WALGREEN']
};

export function normalizeVendorText(text) {
  return text.toUpperCase().replace(/[^\w\s-']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function calculateSimilarity(str1, str2) {
  // Simple similarity check
  const s1 = str1.toUpperCase();
  const s2 = str2.toUpperCase();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  return 0;
}

export function levenshteinDistance(str1, str2) {
  // Simplified version
  if (str1 === str2) return 0;
  return Math.abs(str1.length - str2.length);
}

export function findVendor(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('[VENDOR] First 5 lines:');
  lines.slice(0, 5).forEach((line, i) => {
    console.log(`  ${i}: "${line}"`);
  });
  
  // CRITICAL FIX: Check if first few lines combine to form "THE HOME DEPOT"
  if (lines.length >= 3) {
    // Join first 3 lines with space
    const firstThreeJoined = lines.slice(0, 3).join(' ').toUpperCase();
    const firstThreeConcat = lines.slice(0, 3).join('').toUpperCase();
    
    console.log('[VENDOR] First 3 lines joined:', firstThreeJoined);
    console.log('[VENDOR] First 3 lines concat:', firstThreeConcat);
    
    // Check for HOME DEPOT specifically
    if (firstThreeJoined.includes('HOME DEPOT') || 
        firstThreeConcat.includes('HOMEDEPOT') ||
        firstThreeJoined === 'THE HOME DEPOT' ||
        (lines[0].toUpperCase() === 'THE' && 
         lines[1].toUpperCase() === 'HOME' && 
         lines[2].toUpperCase() === 'DEPOT')) {
      console.log('[VENDOR] ✅ Found HOME DEPOT!');
      return 'Home Depot';
    }
  }
  
  // Check two-line combinations
  for (let i = 0; i < Math.min(4, lines.length - 1); i++) {
    const combined = `${lines[i]} ${lines[i + 1]}`.toUpperCase();
    
    for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
      for (const alias of aliases) {
        if (combined.includes(alias)) {
          console.log(`[VENDOR] ✅ Found ${vendorName} in combined lines ${i}-${i+1}`);
          return vendorName;
        }
      }
    }
  }
  
  // Check individual lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lineUpper = lines[i].toUpperCase();
    
    // Check each known vendor
    for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
      for (const alias of aliases) {
        if (lineUpper.includes(alias)) {
          console.log(`[VENDOR] ✅ Found ${vendorName}: "${lines[i]}"`);
          return vendorName;
        }
      }
    }
  }
  
  // Fallback: Return first substantial line
  for (const line of lines.slice(0, 5)) {
    // Skip obvious non-vendors
    if (line.length < 2) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[\$\d\.\s]+$/.test(line)) continue;
    if (/\d{1,2}[\/\-]\d{1,2}/.test(line)) continue;
    
    // Return first text line
    console.log(`[VENDOR] Using fallback: "${line}"`);
    return line;
  }
  
  return 'Unknown Vendor';
}
