import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Keep only essential imports
import { findVendor } from "./lib/vendor-detection.ts";
import { parseReceiptDate } from "./lib/date-parsing.ts";
import { parseAmounts } from "./lib/amount-parser.ts";
import { validateRequest, createErrorResponse } from "./lib/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRResult {
  vendor?: string;
  total?: number;
  date?: string;
  document_type: 'receipt' | 'invoice' | 'statement' | 'unknown';
  confidence?: {
    vendor?: number;
    total?: number;
    date?: number;
    overall?: number;
  };
}

// Simple 3-step receipt processing
function parseReceiptSimple(text: string): OCRResult {
  console.log('🚀 Starting simple receipt parsing...');
  
  // Step 1: Extract vendor (usually in first 3 lines)
  const vendor = findVendor(text);
  
  // Step 2: Extract total (largest amount after "Total" keyword)
  const amounts = parseAmounts(text);
  const total = amounts.total || amounts.grandTotal;
  
  // Step 3: Extract date (first valid date found)
  const date = parseReceiptDate(text);
  
  // Calculate basic confidence
  const vendorConfidence = vendor ? 0.85 : 0.1;
  const totalConfidence = total ? 0.9 : 0.1;
  const dateConfidence = date ? 0.8 : 0.1;
  const overallConfidence = (vendorConfidence + totalConfidence + dateConfidence) / 3;
  
  console.log(`✅ Extracted - Vendor: ${vendor}, Total: $${total}, Date: ${date}`);
  
  return {
    vendor,
    total,
    date,
    document_type: 'receipt',
    confidence: {
      vendor: vendorConfidence,
      total: totalConfidence,
      date: dateConfidence,
      overall: overallConfidence
    }
  };
}

// Main request handler
serve(async (req) => {
  const startTime = Date.now();
  
  console.log('[INFO] OCR processing request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    const requestValidation = validateRequest(req);
    if (!requestValidation.isValid) {
      return createErrorResponse(
        requestValidation.error || 'Invalid request format',
        'INVALID_REQUEST',
        [],
        corsHeaders
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { imageUrl, testMode = false } = requestData;
    
    let result: OCRResult;
    
    if (testMode) {
      // Simple test mode
      result = parseReceiptSimple(`
        HOME DEPOT
        Store #1234
        Receipt
        Total: $45.67
        Date: 2024-01-15
        Thank you for shopping!
      `);
    } else {
      // Single Vision API call
      const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
      if (!apiKey) {
        return createErrorResponse(
          'OCR service not configured',
          'SERVICE_UNAVAILABLE',
          [],
          corsHeaders
        );
      }
      
      console.log('[INFO] Calling Google Vision API...');
      
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { source: { imageUri: imageUrl } },
              features: [
                { 
                  type: 'DOCUMENT_TEXT_DETECTION', 
                  maxResults: 1 
                }
              ]
            }]
          })
        }
      );

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error(`[ERROR] Vision API error: ${errorText}`);
        return createErrorResponse(
          'OCR service error',
          'OCR_SERVICE_ERROR',
          [],
          corsHeaders
        );
      }

      const visionData = await visionResponse.json();
      console.log('[INFO] Vision API response received');
      
      // Extract text and parse simply
      const text = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
      result = parseReceiptSimple(text);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Processing completed in ${processingTime}ms`);
    
    // Return successful response
    return new Response(JSON.stringify({
      success: true,
      ...result,
      processing_time: processingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[ERROR] Processing failed: ${error.message}`);
    return createErrorResponse(
      'Processing failed',
      'INTERNAL_ERROR',
      [],
      corsHeaders
    );
  }
});
