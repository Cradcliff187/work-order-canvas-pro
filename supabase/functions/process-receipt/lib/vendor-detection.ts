// Vendor detection - ROBUST VERSION for poor OCR
const VENDOR_ALIASES = {
  // Fuel/Gas Stations
  'Shell': ['SHELL', 'SHELL OIL', 'SHELL GASOLINE', 'SHELL OIL CO', 'SH3LL', 'SHEL', 'SH ELL'],
  'BP': ['BP', 'BP GASOLINE', 'BRITISH PETROLEUM', 'BP CONNECT', 'B P'],
  'Marathon': ['MARATHON', 'MARATHON GAS', 'MARATHON PETROLEUM', 'MARATH0N', 'MARAT HON'],
  'Speedway': ['SPEEDWAY', 'SPEEDWAY LLC', 'SPEEDWAY SUPERAMERICA', 'SPEED WAY', 'SP33DWAY'],
  'Circle K': ['CIRCLE K', 'CIRCLE-K', 'CIRCLEK', 'CIRC LE K', 'C1RCLE K'],
  'United Dairy Farmers': ['UDF', 'UNITED DAIRY FARMERS', 'UNITED DAIRY', 'UNITED DF', 'U DF', 'UN1TED DAIRY'],
  'Thorntons': ['THORNTONS', 'THORNTON\'S', 'THORTONS', 'THOMTONS', 'TH0RNTONS', 'THORNTON S'],
  'Kroger Fuel Center': ['KROGER FUEL', 'KROGER GAS', 'KROGER FUEL CENTER', 'KR0GER FUEL', 'KROGER FU3L'],
  'ExxonMobil': ['EXXON', 'MOBIL', 'EXXONMOBIL', 'EXX0N', 'M0BIL', 'EXXON MOBIL'],
  'Sunoco': ['SUNOCO', 'SUNOCO APLUS', 'SUNOCO INC', 'SUN0CO', 'SUNOC0'],
  'Valero': ['VALERO', 'VALERO ENERGY', 'VALERO CORNER STORE', 'VAL3RO', 'VALER0'],
  'Love\'s Travel Stops': ['LOVES', 'LOVE\'S', 'LOVES TRUCK STOP', 'L0VES', 'LOVE S'],
  'Pilot Flying J': ['PILOT', 'FLYING J', 'PILOT TRAVEL CENTER', 'P1LOT', 'FLY1NG J'],
  'TravelCenters of America': ['TA', 'PETRO', 'TRAVEL CENTERS', 'T A', 'PETR0'],

  // Hardware & Tool Retailers
  'Home Depot': [
    'HOME DEPOT', 'THE HOME DEPOT', 'HOMEDEPOT', 'HD', 'DEPOT', 'THD',
    'HO DEPOT', 'HOME DEP0T', 'H0ME DEP0T', 'HOM DEPOT', 'HOME DEPT',
    'HO\nDEPOT', 'H0\nDEP0T', 'THE H0ME DEPOT', 'HONE DEPOT', 'HOWE DEPOT',
    'HOME DEP', 'H DEPOT', 'HOME D', 'THE HD', 'HDEPOT', 'OME DEPOT',
    'HOME DEPO', 'OM DEPOT', 'HOME D3POT'
  ],
  'Lowes': ['LOWES', 'LOWE\'S', 'LOWE S', 'L0WES', 'LOWES HOME CTR', 'LOWE HOME IMPROVEMENT'],
  'Menards': ['MENARDS', 'MENARD\'S', 'MENARD', 'M3NARDS', 'IVEN ARDS', 'MEN ARDS'],
  'Ace Hardware': ['ACE HARDWARE', 'ACE', 'ACE HDWE', 'ACE HARD WARE', 'AC3 HARDWARE'],
  'True Value': ['TRUE VALUE', 'TRUEVALUE', 'TRUE VALUE HARDWARE', 'TRU3 VALUE'],
  'Harbor Freight': ['HARBOR FREIGHT', 'HARBORFREIGHT', 'HARBOR FREIGHT TOOLS', 'HARB0R FREIGHT'],
  'Tractor Supply': ['TRACTOR SUPPLY', 'TSC', 'TRACTOR SUPPLY CO', 'TRACT0R SUPPLY'],
  'Fastenal': ['FASTENAL', 'FASTENAL COMPANY', 'FAST3NAL', 'FASTEN AL'],
  'Grainger': ['GRAINGER', 'WW GRAINGER', 'W.W. GRAINGER', 'GRA1NGER', 'W W GRAINGER'],

  // Building Material Suppliers
  '84 Lumber': ['84 LUMBER', 'EIGHTY FOUR LUMBER', '84 LUMBER CO', '84LUMBER'],
  'Carter Lumber': ['CARTER LUMBER', 'CARTER LUMBER CO', 'CART3R LUMBER'],
  'ABC Supply': ['ABC SUPPLY', 'ABC ROOFING SUPPLY', 'ABC SUPPLY CO', 'AB C SUPPLY'],
  'Beacon Building Products': ['BEACON', 'BEACON ROOFING', 'ALLIED BUILDING PROD', 'BEAC0N'],
  'L&W Supply': ['L&W SUPPLY', 'L & W SUPPLY', 'SEACOAST SUPPLY', 'L AND W SUPPLY'],
  'Ferguson': ['FERGUSON', 'FERGUSON PLUMBING', 'FERGUSON HVAC', 'FERGUSON ENTERPRISES', 'F3RGUSON'],
  'Johnstone Supply': ['JOHNSTONE SUPPLY', 'JOHNSTONE HVAC', 'J0HNSTONE SUPPLY'],
  'Graybar': ['GRAYBAR', 'GRAYBAR ELECTRIC', 'GRAY BAR', 'GRAYB4R'],
  'White Cap': ['WHITE CAP', 'WHITECAP', 'WHITE CAP CONSTRUCTION', 'WH1TE CAP'],

  // Equipment/Tool Rentals
  'Sunbelt Rentals': ['SUNBELT RENTALS', 'SUNBELT', 'SUNBELT RENTAL', 'SUNB3LT RENTALS'],
  'United Rentals': ['UNITED RENTALS', 'UNITEDRENTALS', 'UNITED RENT-ALL', 'UN1TED RENTALS'],
  'Herc Rentals': ['HERC RENTALS', 'HERC RENTAL', 'HERTZ EQUIPMENT', 'H3RC RENTALS'],
  'Art\'s Rental': ['ART\'S RENTAL', 'ARTS RENTAL', 'ART\'S RENTALS', 'ARTS RENTALS', 'ART S RENTAL'],
  'Equipment Depot': ['EQUIPMENT DEPOT', 'EQUIP DEPOT', '3QUIPMENT DEPOT'],
  'Ohio CAT': ['OHIO CAT', 'CAT RENTAL', 'OHIO CAT RENTAL', '0HIO CAT'],

  // General Retail
  'Walmart': ['WALMART', 'WAL-MART', 'WAL MART', 'WALM4RT'],
  'Target': ['TARGET', 'TGT', 'TARG3T'],
  'Costco': ['COSTCO', 'COSTCO WHOLESALE', 'C0STCO'],
  'Sam\'s Club': ['SAMS CLUB', 'SAM\'S CLUB', 'SAMS', 'SAM S CLUB'],
  'CVS': ['CVS', 'CVS PHARMACY'],
  'Walgreens': ['WALGREENS', 'WALGREEN'],

  // Specialty Suppliers
  'Overhead Door': ['OVERHEAD DOOR', 'OVERHEAD DOOR CO', '0VERHEAD DOOR'],
  'Pella': ['PELLA', 'PELLA WINDOWS', 'PELLA CORP', 'P3LLA'],
  'Champion Windows': ['CHAMPION WINDOWS', 'CHAMPION WINDOW', 'CHAMP10N WINDOWS'],
  'Gilkey Window': ['GILKEY', 'GILKEY WINDOWS', 'GILKEY WINDOW CO', 'G1LKEY'],
  'Binswanger Glass': ['BINSWANGER', 'BINSWANGER GLASS', 'B1NSWANGER'],
  'Trane': ['TRANE', 'TRANE SUPPLY', 'TRANE HVAC', 'TRAN3'],
  'Lennox': ['LENNOX', 'LENNOX PARTSPLUS', 'LENNOX INDUSTRIES', 'L3NNOX'],
  'Carrier': ['CARRIER', 'CARRIER ENTERPRISE', 'CARRIER HVAC', 'CARRI3R'],

  // Concrete Suppliers
  'Ernst Concrete': ['ERNST CONCRETE', 'ERNST ENTERPRISES', '3RNST CONCRETE'],
  'Hilltop Basic Resources': ['HILLTOP BASIC', 'HILLTOP RESOURCES', 'HILLTOP CONCRETE', 'H1LLTOP'],
  'Irving Materials': ['IRVING MATERIALS', 'IMI', 'IMI CONCRETE', '1RVING MATERIALS'],
  'Spurlino Materials': ['SPURLINO', 'SPURLINO CONCRETE', 'SPURLIN0'],
  'Cincinnati Ready Mix': ['CINCINNATI READY MIX', 'CINCINNATI READY-MIX', 'C1NCINNATI READY'],
  'All-Rite Ready Mix': ['ALL-RITE READY', 'ALL RITE READY', 'ALLRITE READY', 'ALL R1TE'],

  // Service Providers
  'Roto-Rooter': ['ROTO-ROOTER', 'ROTO ROOTER', 'ROTOROOTER', 'R0TO-ROOTER'],
  'ARS/Rescue Rooter': ['RESCUE ROOTER', 'ARS', 'AMERICAN RESIDENTIAL', 'RESCU3 ROOTER'],
  'Mr. Electric': ['MR ELECTRIC', 'MR. ELECTRIC', 'MISTER ELECTRIC', 'MR 3LECTRIC'],
  'TruGreen': ['TRUGREEN', 'TRU GREEN', 'CHEMLAWN', 'TRUG3EN'],
  'Davey Tree': ['DAVEY TREE', 'DAVEY', 'DAVEY TREE EXPERT', 'DAV3Y TREE'],
  'Jani-King': ['JANI-KING', 'JANIKING', 'JANI KING', 'JAN1-KING'],
  'Cintas': ['CINTAS', 'CINTAS CORPORATION', 'CINTAS UNIFORMS', 'C1NTAS'],
  'ServiceMaster': ['SERVICEMASTER', 'SERVICEMASTER CLEAN', 'SERVICE MASTER', 'SERV1CEMASTER'],
  'Terminix': ['TERMINIX', 'TERMINIX PEST', 'TERM1NIX'],
  'Orkin': ['ORKIN', 'ORKIN PEST', '0RKIN'],
  'Stanley Steemer': ['STANLEY STEEMER', 'STANLEY STEAMERS', 'STANL3Y STEEMER'],
  'ABM Industries': ['ABM', 'ABM INDUSTRIES', 'ABM JANITORIAL', 'ABM SERVICES'],

  // Testing Labs
  'Terracon': ['TERRACON', 'TERRACON CONSULTANTS', 'T3RRACON'],
  'Bowser-Morner': ['BOWSER-MORNER', 'BOWSER MORNER', 'B0WSER-MORNER'],
  'S&ME': ['S&ME', 'S AND ME', 'S & ME'],
  'CTL Engineering': ['CTL ENGINEERING', 'CTL ENG', 'CTL INC', 'CTL 3NGINEERING'],
  'Geotechnology': ['GEOTECHNOLOGY', 'GEOTECHNOLOGY INC', 'G30TECHNOLOGY'],
  'Intertek-PSI': ['PSI', 'PROFESSIONAL SERVICE IND', 'INTERTEK', 'INT3RTEK'],

  // Office Suppliers
  'Staples': ['STAPLES', 'STAPLES OFFICE', 'STAPL3S'],
  'Office Depot': ['OFFICE DEPOT', 'OFFICEMAX', 'OFFICE MAX', '0FFICE DEPOT'],
  'W.B. Mason': ['WB MASON', 'W.B. MASON', 'W B MASON', 'WB MAS0N'],
  'Uline': ['ULINE', 'U-LINE', 'UL1NE'],
  'Xerox': ['XEROX', 'XEROX CORP', 'X3ROX'],

  // Utilities & Waste
  'Duke Energy': ['DUKE ENERGY', 'DUKE ENERGY OHIO', 'DUKE ENERGY KENTUCKY', 'DUK3 ENERGY'],
  'AES Ohio': ['AES OHIO', 'DAYTON POWER', 'DP&L', 'DPL', 'A3S OHIO'],
  'Kentucky Utilities': ['KENTUCKY UTILITIES', 'KU', 'LG&E-KU', 'K3NTUCKY UTILITIES'],
  'Columbia Gas': ['COLUMBIA GAS', 'NISOURCE', 'C0LUMBIA GAS'],
  'CenterPoint Energy': ['CENTERPOINT ENERGY', 'VECTREN', 'CENTERP0INT'],
  'Rumpke': ['RUMPKE', 'RUMPKE WASTE', 'RUMPKE CONSOLIDATED', 'RUMPK3'],
  'Waste Management': ['WASTE MANAGEMENT', 'WM', 'WASTE MGMT', 'WAST3 MANAGEMENT'],
  'Republic Services': ['REPUBLIC SERVICES', 'REPUBLIC WASTE', 'R3PUBLIC SERVICES']
};

// Vendor slogans and unique identifiers
const VENDOR_SLOGANS = {
  'Home Depot': [
    'How doers get more done',
    'More saving. More doing',
    'More Saving. More Doing.',
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
  ],
  'Shell': [
    'Fuel Rewards'
  ],
  'BP': [
    'BPme Rewards'
  ],
  'Marathon': [
    'MakeItCount Rewards',
    'Make It Count'
  ],
  'Speedway': [
    'Speedy Rewards'
  ],
  'Circle K': [
    'Take it Easy'
  ],
  'United Dairy Farmers': [
    'Homemade Brand Ice Cream'
  ],
  'Thorntons': [
    'Refreshing Rewards'
  ],
  'Kroger Fuel Center': [
    'Fuel Points'
  ],
  'ExxonMobil': [
    'Synergy Fuel',
    'Mobil 1'
  ],
  'Lowes': [
    'Never Stop Improving',
    'Do it right for less'
  ],
  'Menards': [
    'Save BIG Money',
    'Save Big Money'
  ],
  'Ace Hardware': [
    'The Helpful Place'
  ],
  'True Value': [
    'Start Right. Start Here.'
  ],
  'Harbor Freight': [
    'Quality Tools, Lowest Prices',
    'Whatever You Do, Do It For Less',
    'Do It For Less'
  ],
  'Tractor Supply': [
    'For Life Out Here'
  ],
  'Grainger': [
    'For the ones who get it done'
  ],
  'Ferguson': [
    'Nobody expects more from us than we do.'
  ],
  'Love\'s Travel Stops': [
    'Clean Places, Friendly Faces'
  ],
  'Pilot Flying J': [
    'Pilot Rewards'
  ],
  'Champion Windows': [
    'Champion Windows & Home Exteriors'
  ],
  'Jani-King': [
    'The King of Clean'
  ],
  'Staples': [
    'That Was Easy'
  ],
  'Office Depot': [
    'Taking Care of Business'
  ],
  'W.B. Mason': [
    'Who But W.B. Mason'
  ],
  'Waste Management': [
    'Think Green'
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
