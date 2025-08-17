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

  // VENDOR - Look for Home Depot specifically first (handles "HO\nDEPOT")
  const homeDepotRegex = /HOME\s*DEPOT|HOMEDEPOT/i;
  const fullText = text.toUpperCase();
  
  // Check for multi-line Home Depot pattern (HO + DEPOT)
  const homeDepotMultiline = /HO\s*\n\s*DEPOT/i;
  if (homeDepotMultiline.test(text) || homeDepotRegex.test(fullText)) {
    result.vendor = 'Home Depot';
    result.confidence!.vendor = 0.9;
    console.log('✅ Found Home Depot (multi-line or standard)');
  } else {
    // Check first 5 lines for other store names
    console.log('🔍 Checking vendor in first 5 lines...');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toUpperCase();
      console.log(`Line ${i}: "${line}"`);
      
      if (line.includes('LOWE')) result.vendor = 'Lowes';
      else if (line.includes('MENARDS')) result.vendor = 'Menards';
      else if (line.includes('DEPOT')) result.vendor = 'Home Depot';
      else if (line.includes('HARBOR')) result.vendor = 'Harbor Freight';
      // Add more as needed
      
      if (result.vendor) {
        result.confidence!.vendor = 0.8;
        console.log(`✅ Found vendor: ${result.vendor}`);
        break;
      }
    }
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

  // EXTRACT LINE ITEMS - REWRITTEN FOR HOME DEPOT
  console.log('🔍 Extracting line items...');
  const lineItems: LineItem[] = [];

  // Home Depot formats:
  // "098168701990 2X8-8 PT 2P <A>"
  // "2X8-8FT #2PRIME PT GC    207.57    15.14"
  // "885196000214 6068 RD PD <A>    578.00"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip non-item lines
    if (!line || line.length < 10) continue;
    if (line.match(/HOME|DEPOT|MARKET|DRIVE|CASHIER|SUBTOTAL|TAX|TOTAL|CARD|GIFT|BALANCE|RETURN|POLICY|DAYS|EXPIRES|\*{3,}/i)) continue;
    
    // Find ALL numbers that look like prices at the end of the line
    const pricePattern = /(\d+\.\d{2})(?:\s+(\d+\.\d{2}))?$/;
    const priceMatch = line.match(pricePattern);
    
    if (priceMatch) {
      // Extract description (everything before the price)
      const beforePrice = line.substring(0, line.indexOf(priceMatch[0])).trim();
      
      // Clean the description
      let description = beforePrice
        .replace(/^\d{10,12}\s*/, '') // Remove UPC (10-12 digits)
        .replace(/^\d{4}\s+\d{5}\s*/, '') // Remove SKU patterns
        .replace(/<[A-Z]>\s*$/, '') // Remove <A> type markers
        .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
        .trim();
      
      // Skip if no meaningful description
      if (!description || description.length < 3) continue;
      
      const totalPrice = parseFloat(priceMatch[1]);
      
      // If there's a second price, it might be unit price
      if (priceMatch[2]) {
        const unitPrice = parseFloat(priceMatch[2]);
        const quantity = Math.round(totalPrice / unitPrice);
        
        lineItems.push({
          description: description,
          quantity: quantity > 1 ? quantity : 1,
          unit_price: unitPrice,
          total_price: totalPrice
        });
        
        console.log(`✅ Found item (with unit price): ${quantity}x ${description} @ $${unitPrice} = $${totalPrice}`);
      } else {
        // Single price - check next line for quantity indicator
        let quantity = 1;
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const qtyMatch = nextLine.match(/^(\d+)[@xX]\s*(\d+\.\d{2})/);
          if (qtyMatch) {
            quantity = parseInt(qtyMatch[1]);
            i++; // Skip the quantity line
          }
        }
        
        lineItems.push({
          description: description,
          quantity: quantity > 1 ? quantity : undefined,
          total_price: totalPrice
        });
        
        console.log(`✅ Found item: ${description} - $${totalPrice}`);
      }
    }
  }

  // ALWAYS set lineItems, even if empty
  result.lineItems = lineItems;
  result.confidence!.lineItems = lineItems.length > 0 ? 0.7 : 0.0;

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