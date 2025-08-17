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
    vendor: '',
    total: 0,
    date: '',
    confidence: {}
  };

  // Extract vendor (usually first few lines, look for common indicators)
  const vendorPatterns = [
    /^(HOME DEPOT|LOWES|MENARDS|HARBOR FREIGHT)/i,
    /^(SHELL|BP|SPEEDWAY|CIRCLE K)/i,
    /^(MCDONALD'S|SUBWAY|JIMMY JOHNS)/i,
    /^([A-Z][A-Z\s&]{2,30})/  // Generic business name
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

  // Extract amounts - FIXED: Added 'g' flag for global matching
  const amounts: number[] = [];
  const amountPattern = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  
  for (const line of lines) {
    // Look for lines with TOTAL, AMOUNT, etc.
    if (/TOTAL|AMOUNT|BALANCE|DUE/i.test(line)) {
      const matches = Array.from(line.matchAll(amountPattern));
      for (const match of matches) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0 && amount < 10000) {
          amounts.push(amount);
        }
      }
    }
  }

  // If no amounts found with TOTAL keyword, look for any amounts
  if (amounts.length === 0) {
    const allText = text.replace(/\n/g, ' ');
    const matches = Array.from(allText.matchAll(amountPattern));
    for (const match of matches) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (amount > 0 && amount < 10000) {
        amounts.push(amount);
      }
    }
  }

  if (amounts.length > 0) {
    // Usually the largest amount is the total
    result.total = Math.max(...amounts);
    result.confidence!.total = 0.7;
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

  return result;
}