import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
}

interface OCRResult {
  vendor?: string;
  vendor_raw?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  lineItems?: LineItem[];
  document_type: 'receipt' | 'invoice' | 'statement' | 'unknown';
  document_confidence: number;
  confidence?: {
    vendor?: number;
    total?: number;
    date?: number;
    lineItems?: number;
  };
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

function normalizeVendorText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^\w\s-']/g, ' ') // Remove special chars except hyphens and apostrophes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function levenshteinDistance(str1: string, str2: string): number {
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

function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

function findVendor(text: string): { vendor: string; vendor_raw: string; confidence: number } {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const fullTextNormalized = normalizeVendorText(text);
  
  let bestMatch = { vendor: '', vendor_raw: '', confidence: 0 };
  
  // Phase 1: Exact matching (existing logic)
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
            confidence 
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
              confidence 
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
        confidence: 0.9 
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
        confidence: bestFuzzyMatch.confidence
      };
    }
  }
  
  return bestMatch;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('Missing imageUrl parameter');
    }

    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    console.log('Processing receipt OCR for image:', imageUrl);

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              source: {
                imageUri: imageUrl
              }
            },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
            ]
          }]
        })
      }
    );

    if (!visionResponse.ok) {
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const textAnnotations = visionData.responses?.[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      console.log('No text detected in image');
      return new Response(
        JSON.stringify({ 
          error: 'No text detected in image',
          vendor: '',
          total: 0,
          document_type: 'unknown',
          document_confidence: 0,
          confidence: {}
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const fullText = textAnnotations[0].description || '';
    console.log('Extracted text:', fullText);

    // Detect document type first
    const documentDetection = detectDocumentType(fullText);
    console.log('Document detection:', documentDetection);

    // Parse receipt data from OCR text
    const result = parseReceiptText(fullText);
    
    // Add document type information to result
    result.document_type = documentDetection.type;
    result.document_confidence = documentDetection.confidence;
    
    console.log('Parsed result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('OCR processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        vendor: '',
        total: 0,
        document_type: 'unknown',
        document_confidence: 0,
        confidence: {}
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function parseReceiptText(text: string): OCRResult {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // DEBUG - Log first 10 lines to see what we're working with
  console.log('First 10 lines:', lines.slice(0, 10));
  
  const result: OCRResult = {
    vendor: '',
    total: 0,
    date: '',
    confidence: {}
  };

  // VENDOR - Use new vendor normalization
  console.log('🔍 Searching for vendor using normalization...');
  const vendorMatch = findVendor(text);
  
  if (vendorMatch.vendor) {
    result.vendor = vendorMatch.vendor;
    result.vendor_raw = vendorMatch.vendor_raw;
    result.confidence!.vendor = vendorMatch.confidence;
    console.log(`✅ Found vendor: ${vendorMatch.vendor} (raw: "${vendorMatch.vendor_raw}") with confidence ${vendorMatch.confidence}`);
  } else {
    console.log('❌ No vendor detected');
    result.vendor = '';
    result.vendor_raw = '';
    result.confidence!.vendor = 0;
  }

  // SUBTOTAL - Extract subtotal first
  const subtotalRegex = /SUBTOTAL[\s:]*\$?([,\d]+\.?\d{0,2})/i;
  const subtotalMatch = text.match(subtotalRegex);
  if (subtotalMatch) {
    result.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
    console.log(`✅ Found SUBTOTAL: ${result.subtotal}`);
  }

  // TAX - Extract tax amount
  const taxRegex = /(?:SALES\s)?TAX[\s:]*\$?([,\d]+\.?\d{0,2})/i;
  const taxMatch = text.match(taxRegex);
  if (taxMatch) {
    result.tax = parseFloat(taxMatch[1].replace(/,/g, ''));
    console.log(`✅ Found TAX: ${result.tax}`);
  }

  // TOTAL - Look for the word TOTAL followed by amount (prioritize this)
  console.log('🔍 Searching for TOTAL amount...');
  
  // Try word-boundary TOTAL pattern first (prevents matching SUBTOTAL)
  const totalRegex = /\bTOTAL\b[\s:]*\$?([,\d]+\.?\d{0,2})/i;
  const totalMatch = text.match(totalRegex);
  
  if (totalMatch) {
    result.total = parseFloat(totalMatch[1].replace(/,/g, ''));
    result.confidence!.total = 0.9;
    console.log(`✅ Found TOTAL: ${result.total} (from pattern: ${totalMatch[0]})`);
  } else {
    // Try negative lookbehind to explicitly exclude SUBTOTAL
    const negativeLookbehindRegex = /(?<!SUB)TOTAL\b[\s:]*\$?([,\d]+\.?\d{0,2})/i;
    const negativeLookbehindMatch = text.match(negativeLookbehindRegex);
    
    if (negativeLookbehindMatch) {
      result.total = parseFloat(negativeLookbehindMatch[1].replace(/,/g, ''));
      result.confidence!.total = 0.9;
      console.log(`✅ Found TOTAL (negative lookbehind): ${result.total} (from pattern: ${negativeLookbehindMatch[0]})`);
    } else {
      // Fallback: Look for multi-line TOTAL pattern (TOTAL\n$791.17)
      const multilineTotalRegex = /\bTOTAL\b\s*\n\s*\$?([,\d]+\.?\d{0,2})/i;
      const multilineMatch = text.match(multilineTotalRegex);
      
      if (multilineMatch) {
        result.total = parseFloat(multilineMatch[1].replace(/,/g, ''));
        result.confidence!.total = 0.8;
        console.log(`✅ Found multi-line TOTAL: ${result.total} (from pattern: ${multilineMatch[0]})`);
      } else if (result.subtotal && result.tax) {
        // Calculate total from subtotal + tax if available
        result.total = result.subtotal + result.tax;
        result.confidence!.total = 0.7;
        console.log(`✅ Calculated TOTAL from subtotal + tax: ${result.total}`);
      } else {
        // Last resort: Find largest dollar amount (but be more selective)
        console.log('⚠️ No TOTAL found, looking for largest amount...');
        const amountRegex = /\$?([,\d]+\.\d{2})/g;
        const amounts = [...text.matchAll(amountRegex)]
          .map(m => {
            const amount = parseFloat(m[1].replace(/,/g, ''));
            console.log(`Found amount: ${amount} from "${m[0]}"`);
            return amount;
          })
          .filter(a => a > 0 && a < 10000)
          .sort((a, b) => b - a);
        
        if (amounts.length > 0) {
          result.total = amounts[0]; // Largest amount
          result.confidence!.total = 0.5; // Lower confidence
          console.log(`⚠️ Using largest amount as fallback: ${result.total}`);
        }
      }
    }
  }

  // EXTRACT LINE ITEMS - ENHANCED WITH MULTI-LINE GROUPING
  console.log('🔍 Extracting line items with enhanced parsing...');
  const lineItems: LineItem[] = [];

  // Helper function to analyze receipt structure and identify price columns
  function analyzeReceiptStructure(lines: string[]) {
    const priceColumnPositions: number[] = [];
    let rightAlignedPrices = 0;
    
    for (const line of lines) {
      const priceMatch = line.match(/\$?(\d+\.\d{2})$/);
      if (priceMatch) {
        const position = line.lastIndexOf(priceMatch[0]);
        priceColumnPositions.push(position);
        rightAlignedPrices++;
      }
    }
    
    const avgPricePosition = priceColumnPositions.length > 0 
      ? priceColumnPositions.reduce((sum, pos) => sum + pos, 0) / priceColumnPositions.length 
      : -1;
    
    return {
      hasStructuredLayout: rightAlignedPrices > 2,
      avgPricePosition,
      totalLines: lines.length
    };
  }

  // Helper function to detect if a line is likely a continuation of an item description
  function isDescriptionContinuation(currentLine: string, previousLine: string, structure: any): boolean {
    // If current line has no price but previous line didn't either, likely continuation
    const currentHasPrice = /\$?\d+\.\d{2}/.test(currentLine);
    const previousHasPrice = /\$?\d+\.\d{2}/.test(previousLine);
    
    if (currentHasPrice) return false; // Lines with prices are typically complete items
    
    // Check for indentation pattern (continuation lines often have leading whitespace)
    const currentIndent = currentLine.length - currentLine.trimLeft().length;
    const isIndented = currentIndent > 0;
    
    // Check if line is too short to be a complete item
    const isTooShort = currentLine.trim().length < 15;
    
    // Check if previous line ended abruptly (no price, reasonable length)
    const previousTrimmed = previousLine.trim();
    const previousEndedAbruptly = !previousHasPrice && previousTrimmed.length > 5 && previousTrimmed.length < 50;
    
    return (isIndented || isTooShort) && previousEndedAbruptly;
  }

  // Helper function to extract quantity from various patterns
  function extractQuantity(text: string): { quantity: number; cleanText: string } {
    const patterns = [
      { regex: /^(\d+)x\s+(.+)/i, multiplier: true },           // "3x ITEM NAME"
      { regex: /^(\d+)\s*@\s*(.+)/i, multiplier: true },        // "2 @ ITEM NAME"
      { regex: /^qty:?\s*(\d+)\s+(.+)/i, multiplier: true },    // "QTY: 5 ITEM NAME"
      { regex: /^(\d+\.\d+)\s*lbs?\s+(.+)/i, multiplier: true }, // "2.5 lbs ITEM NAME"
      { regex: /^(\d+)\s+(.+)/i, multiplier: false },           // "3 ITEM NAME" (less confident)
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const qty = parseFloat(match[1]);
        if (qty > 0 && qty <= 999) { // Reasonable quantity range
          return {
            quantity: qty,
            cleanText: match[2].trim()
          };
        }
      }
    }
    
    return { quantity: 1, cleanText: text };
  }

  // Helper function to extract prices and detect price structure
  function extractPrices(line: string): { totalPrice?: number; unitPrice?: number; confidence: number } {
    // Enhanced price patterns for different receipt formats
    const pricePatterns = [
      // Two prices: total and unit price (e.g., "123.45  12.99")
      { regex: /(\d+\.\d{2})\s+(\d+\.\d{2})$/, totalIndex: 1, unitIndex: 2, confidence: 0.9 },
      // Single price at end
      { regex: /\$?(\d+\.\d{2})$/, totalIndex: 1, unitIndex: null, confidence: 0.8 },
      // Price with currency symbol
      { regex: /\$(\d+\.\d{2})\s*$/, totalIndex: 1, unitIndex: null, confidence: 0.85 },
      // Multiple prices in line (take the rightmost as total)
      { regex: /.*\$?(\d+\.\d{2})\s*$/, totalIndex: 1, unitIndex: null, confidence: 0.7 }
    ];
    
    for (const pattern of pricePatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const totalPrice = parseFloat(match[pattern.totalIndex]);
        const unitPrice = pattern.unitIndex ? parseFloat(match[pattern.unitIndex]) : undefined;
        
        // Validate prices are reasonable
        if (totalPrice > 0 && totalPrice < 10000) {
          return {
            totalPrice,
            unitPrice: unitPrice && unitPrice > 0 && unitPrice < 1000 ? unitPrice : undefined,
            confidence: pattern.confidence
          };
        }
      }
    }
    
    return { confidence: 0 };
  }

  // Analyze receipt structure first
  const structure = analyzeReceiptStructure(lines);
  console.log(`📊 Receipt structure: ${structure.hasStructuredLayout ? 'structured' : 'unstructured'}, avg price position: ${structure.avgPricePosition}`);

  // Group related lines and extract items
  const processedLines: Array<{ combined: string; confidence: number; lineNumbers: number[] }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip non-item lines
    if (!line || line.length < 5) continue;
    if (line.match(/HOME|DEPOT|MARKET|DRIVE|CASHIER|SUBTOTAL|TAX|TOTAL|CARD|GIFT|BALANCE|RETURN|POLICY|DAYS|EXPIRES|\*{3,}|PHONE|ADDRESS|THANK YOU/i)) continue;
    
    let combinedLine = line;
    let confidence = 0.8;
    const lineNumbers = [i];
    
    // Check if next line(s) might be continuation of current item
    let j = i + 1;
    while (j < lines.length && j - i <= 3) { // Limit to 3 continuation lines max
      const nextLine = lines[j].trim();
      if (!nextLine) break;
      
      if (isDescriptionContinuation(nextLine, combinedLine, structure)) {
        combinedLine += ' ' + nextLine;
        lineNumbers.push(j);
        confidence *= 0.9; // Slightly lower confidence for multi-line items
        j++;
      } else {
        break;
      }
    }
    
    processedLines.push({ combined: combinedLine, confidence, lineNumbers });
    i = j - 1; // Skip the lines we've already processed
  }

  console.log(`📋 Processed ${processedLines.length} potential items from ${lines.length} lines`);

  // Extract items from processed lines
  for (const processedLine of processedLines) {
    const { combined, confidence: groupConfidence, lineNumbers } = processedLine;
    
    const prices = extractPrices(combined);
    if (prices.totalPrice) {
      // Extract description (everything before the price)
      const priceText = combined.match(/\$?\d+\.\d{2}.*$/)?.[0] || '';
      const beforePrice = combined.substring(0, combined.lastIndexOf(priceText)).trim();
      
      // Extract quantity and clean description
      const { quantity, cleanText } = extractQuantity(beforePrice);
      
      // Clean the description further
      let description = cleanText
        .replace(/^\d{10,14}\s*/, '') // Remove UPC/EAN (10-14 digits)
        .replace(/^\d{4,6}\s+\d{4,6}\s*/, '') // Remove SKU patterns
        .replace(/<[A-Z]>\s*$/, '') // Remove <A> type markers
        .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
        .replace(/[^\w\s\-\.\/&%#]+/g, ' ') // Remove excessive special characters
        .trim();
      
      // Skip if no meaningful description
      if (!description || description.length < 2) {
        console.log(`⏭️ Skipping item with insufficient description: "${combined}"`);
        continue;
      }
      
      // Calculate unit price if not provided
      let finalUnitPrice = prices.unitPrice;
      if (!finalUnitPrice && quantity > 1) {
        finalUnitPrice = prices.totalPrice / quantity;
      }
      
      // Create line item with confidence scoring
      const item: LineItem = {
        description,
        total_price: prices.totalPrice
      };
      
      if (quantity > 1) {
        item.quantity = quantity;
      }
      
      if (finalUnitPrice && finalUnitPrice !== prices.totalPrice) {
        item.unit_price = Math.round(finalUnitPrice * 100) / 100; // Round to 2 decimal places
      }
      
      lineItems.push(item);
      
      const qtyText = quantity > 1 ? `${quantity}x ` : '';
      const unitText = finalUnitPrice && finalUnitPrice !== prices.totalPrice ? ` @ $${finalUnitPrice}` : '';
      console.log(`✅ Found item: ${qtyText}${description}${unitText} = $${prices.totalPrice} (confidence: ${(groupConfidence * prices.confidence).toFixed(2)}, lines: ${lineNumbers.join(',')})`);
    }
  }

  // ALWAYS set lineItems, even if empty
  result.lineItems = lineItems;
  
  // Enhanced confidence scoring based on extraction success
  let lineItemsConfidence = 0.0;
  if (lineItems.length > 0) {
    const hasQuantities = lineItems.filter(item => item.quantity && item.quantity > 1).length;
    const hasUnitPrices = lineItems.filter(item => item.unit_price).length;
    const avgDescriptionLength = lineItems.reduce((sum, item) => sum + item.description.length, 0) / lineItems.length;
    
    lineItemsConfidence = 0.5; // Base confidence
    if (structure.hasStructuredLayout) lineItemsConfidence += 0.1;
    if (hasQuantities > 0) lineItemsConfidence += 0.1;
    if (hasUnitPrices > 0) lineItemsConfidence += 0.1;
    if (avgDescriptionLength > 10) lineItemsConfidence += 0.1;
    if (lineItems.length >= 3) lineItemsConfidence += 0.1;
    
    lineItemsConfidence = Math.min(lineItemsConfidence, 0.9); // Cap at 0.9
  }
  
  result.confidence!.lineItems = lineItemsConfidence;

  console.log(`✅ Total items extracted: ${lineItems.length}`);
  if (lineItems.length === 0) {
    console.warn('⚠️ No line items found - check regex patterns');
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
    /(\d{1,2}-\d{1,2}-\d{2,4})/g,
    /(\d{4}-\d{1,2}-\d{1,2})/g,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const matches = Array.from(line.matchAll(pattern));
      for (const match of matches) {
        try {
          const dateStr = match[1];
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            result.date = date.toISOString().split('T')[0];
            result.confidence!.date = 0.7;
            break;
          }
        } catch (e) {
          console.log('Date parsing error:', e);
        }
      }
      if (result.date) break;
    }
    if (result.date) break;
  }

  // If no date found, use today
  if (!result.date) {
    result.date = new Date().toISOString().split('T')[0];
    result.confidence!.date = 0.3;
  }

  // After all extraction, validate the math
  if (result.subtotal && result.tax && result.total) {
    const calculated = result.subtotal + result.tax;
    if (Math.abs(calculated - result.total) > 0.01) {
      console.warn(`⚠️ Total mismatch! Extracted: ${result.total}, Calculated: ${calculated}`);
      // Use the calculated value as it's more reliable
      result.total = calculated;
    }
  }

  return result;
}

function detectDocumentType(text: string): { type: 'receipt' | 'invoice' | 'statement' | 'unknown', confidence: number, reasoning: string } {
  const textUpper = text.toUpperCase();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Initialize scores
  let receiptScore = 0;
  let invoiceScore = 0;
  let statementScore = 0;
  
  const reasoning: string[] = [];
  
  // Receipt detection patterns
  const receiptKeywords = ['RECEIPT', 'SUBTOTAL', 'SALES TAX', 'TAX', 'TOTAL', 'CHANGE', 'THANK YOU'];
  const receiptVendors = ['HOME DEPOT', 'WALMART', 'TARGET', 'LOWES', 'MENARDS', 'HARBOR FREIGHT', 'COSTCO'];
  const receiptStructure = [/SUBTOTAL[\s:]*\$?[\d,]+\.?\d{0,2}/i, /TAX[\s:]*\$?[\d,]+\.?\d{0,2}/i, /TOTAL[\s:]*\$?[\d,]+\.?\d{0,2}/i];
  
  // Invoice detection patterns
  const invoiceKeywords = ['INVOICE', 'INVOICE #', 'INVOICE NUMBER', 'NET', 'TERMS', 'DUE DATE', 'PAYMENT DUE', 'REMIT TO'];
  const invoiceNumbers = [/INVOICE\s*#?\s*[A-Z0-9-]+/i, /INV[-#]?\s*[A-Z0-9]+/i];
  const invoiceTerms = ['NET 30', 'NET 15', 'DUE UPON RECEIPT', 'PAYMENT TERMS', 'DUE DATE'];
  
  // Statement detection patterns
  const statementKeywords = ['STATEMENT', 'ACCOUNT', 'BALANCE', 'PREVIOUS BALANCE', 'CURRENT BALANCE', 'STATEMENT DATE'];
  const statementStructure = ['ACCOUNT NUMBER', 'STATEMENT PERIOD', 'PREVIOUS BALANCE', 'PAYMENTS', 'CHARGES'];
  
  // Check receipt indicators
  for (const keyword of receiptKeywords) {
    if (textUpper.includes(keyword)) {
      receiptScore += 0.1;
      reasoning.push(`Receipt keyword: ${keyword}`);
    }
  }
  
  for (const vendor of receiptVendors) {
    if (textUpper.includes(vendor)) {
      receiptScore += 0.15;
      reasoning.push(`Receipt vendor: ${vendor}`);
    }
  }
  
  for (const pattern of receiptStructure) {
    if (pattern.test(text)) {
      receiptScore += 0.15;
      reasoning.push(`Receipt structure: ${pattern.source}`);
    }
  }
  
  // Check for item list structure (strong receipt indicator)
  const itemLines = lines.filter(line => /\$[\d,]+\.\d{2}$/.test(line));
  if (itemLines.length >= 2) {
    receiptScore += 0.2;
    reasoning.push(`Item list structure: ${itemLines.length} items found`);
  }
  
  // Check invoice indicators
  for (const keyword of invoiceKeywords) {
    if (textUpper.includes(keyword)) {
      invoiceScore += 0.15;
      reasoning.push(`Invoice keyword: ${keyword}`);
    }
  }
  
  for (const pattern of invoiceNumbers) {
    if (pattern.test(text)) {
      invoiceScore += 0.2;
      reasoning.push(`Invoice number pattern: ${pattern.source}`);
    }
  }
  
  for (const term of invoiceTerms) {
    if (textUpper.includes(term)) {
      invoiceScore += 0.15;
      reasoning.push(`Invoice term: ${term}`);
    }
  }
  
  // Check statement indicators
  for (const keyword of statementKeywords) {
    if (textUpper.includes(keyword)) {
      statementScore += 0.15;
      reasoning.push(`Statement keyword: ${keyword}`);
    }
  }
  
  for (const structure of statementStructure) {
    if (textUpper.includes(structure)) {
      statementScore += 0.1;
      reasoning.push(`Statement structure: ${structure}`);
    }
  }
  
  // Normalize scores to 0-1 range
  receiptScore = Math.min(receiptScore, 1.0);
  invoiceScore = Math.min(invoiceScore, 1.0);
  statementScore = Math.min(statementScore, 1.0);
  
  console.log(`📊 Document type scores: Receipt=${receiptScore.toFixed(2)}, Invoice=${invoiceScore.toFixed(2)}, Statement=${statementScore.toFixed(2)}`);
  
  // Determine document type
  const maxScore = Math.max(receiptScore, invoiceScore, statementScore);
  
  if (maxScore < 0.3) {
    console.log('🤷 Document type uncertain - defaulting to unknown');
    return {
      type: 'unknown',
      confidence: maxScore,
      reasoning: `Low confidence detection. ${reasoning.join('; ')}`
    };
  }
  
  let detectedType: 'receipt' | 'invoice' | 'statement' | 'unknown';
  if (receiptScore === maxScore) {
    detectedType = 'receipt';
    console.log(`📄 Detected as RECEIPT with confidence ${receiptScore.toFixed(2)}`);
  } else if (invoiceScore === maxScore) {
    detectedType = 'invoice';
    console.log(`📋 Detected as INVOICE with confidence ${invoiceScore.toFixed(2)}`);
  } else {
    detectedType = 'statement';
    console.log(`📊 Detected as STATEMENT with confidence ${statementScore.toFixed(2)}`);
  }
  
  return {
    type: detectedType,
    confidence: maxScore,
    reasoning: reasoning.join('; ')
  };
}