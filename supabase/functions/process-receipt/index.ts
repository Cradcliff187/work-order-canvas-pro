import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRResult {
  vendor?: string;
  total?: number;
  date?: string;
  confidence?: {
    vendor?: number;
    total?: number;
    date?: number;
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
          confidence: {}
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const fullText = textAnnotations[0].description || '';
    console.log('Extracted text:', fullText);

    // Parse receipt data from OCR text
    const result = parseReceiptText(fullText);
    
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
  
  const result: OCRResult = {
    confidence: {}
  };

  // Extract vendor (usually first few lines, look for common indicators)
  const vendorPatterns = [
    /^(HOME DEPOT|LOWES|MENARDS|HARBOR FREIGHT)/i,
    /^(SHELL|BP|SPEEDWAY|CIRCLE K)/i,
    /^(MCDONALD'S|SUBWAY|JIMMY JOHNS)/i,
    /^([A-Z][A-Z\s&]{2,25})/  // Generic: 2+ uppercase words
  ];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    for (const pattern of vendorPatterns) {
      const match = lines[i].match(pattern);
      if (match) {
        result.vendor = match[1] || match[0];
        result.confidence!.vendor = 0.8;
        break;
      }
    }
    if (result.vendor) break;
  }

  // Extract total amount (look for common total indicators)
  const amountPatterns = [
    /(?:TOTAL|AMOUNT|BALANCE|GRAND TOTAL|SUBTOTAL)[\s:]*\$?(\d+\.?\d{0,2})/i,
    /\$(\d+\.\d{2})(?:\s|$)/g,  // Any dollar amount
    /(\d+\.\d{2})$/m  // Amount at end of line
  ];

  let amounts: number[] = [];
  
  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const matches = Array.from(line.matchAll(pattern));
      for (const match of matches) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) {  // Reasonable range
          amounts.push(amount);
        }
      }
    }
  }

  if (amounts.length > 0) {
    // Use the largest amount found (likely the total)
    result.total = Math.max(...amounts);
    result.confidence!.total = 0.7;
  }

  // Extract date (look for date patterns)
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{4}-\d{1,2}-\d{1,2})/
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const dateStr = match[1];
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            result.date = date.toISOString().split('T')[0];
            result.confidence!.date = 0.6;
            break;
          }
        } catch (e) {
          console.log('Date parsing error:', e);
        }
      }
    }
    if (result.date) break;
  }

  return result;
}