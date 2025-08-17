import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { findVendor } from "./lib/vendor-detection.ts";
import { parseReceiptDate } from "./lib/date-parsing.ts";
import { parseAmounts } from "./lib/amount-parser.ts";
import { validateRequest, createErrorResponse } from "./lib/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

// Cache functions
async function checkCache(imageUrl: string): Promise<any> {
  try {
    const imageHash = imageUrl.split('/').pop()?.split('?')[0] || imageUrl;
    console.log(`[CACHE] Checking cache for: ${imageHash}`);
    
    const { data, error } = await supabase
      .from('receipt_ocr_cache')
      .select('ocr_result')
      .eq('image_hash', imageHash)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      console.log('[CACHE] No cache hit:', error.message);
      return null;
    }
    
    if (data?.ocr_result) {
      console.log('[CACHE] ✅ Cache HIT!');
      return data.ocr_result;
    }
    
    return null;
  } catch (error) {
    console.error('[CACHE] Check error:', error);
    return null;
  }
}

async function saveToCache(imageUrl: string, result: any): Promise<void> {
  try {
    const imageHash = imageUrl.split('/').pop()?.split('?')[0] || imageUrl;
    console.log(`[CACHE] Saving result for: ${imageHash}`);
    
    const { error } = await supabase
      .from('receipt_ocr_cache')
      .upsert({
        image_hash: imageHash,
        ocr_result: result,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'image_hash'
      });
    
    if (error) {
      console.error('[CACHE] Save error:', error);
    } else {
      console.log('[CACHE] ✅ Result cached');
    }
  } catch (error) {
    console.error('[CACHE] Save error:', error);
  }
}

// Parse receipt
function parseReceiptSimple(text: string) {
  console.log('🚀 Starting receipt parsing...');
  console.log('First 10 lines of OCR text:');
  text.split('\n').slice(0, 10).forEach((line, i) => {
    console.log(`  ${i}: "${line}"`);
  });
  
  // Extract vendor
  const vendor = findVendor(text);
  
  // Extract amounts
  const amounts = parseAmounts(text);
  const total = amounts.total || amounts.grandTotal;
  
  // Extract date
  const date = parseReceiptDate(text);
  
  // Calculate confidence
  const vendorConfidence = vendor && vendor !== 'Unknown Vendor' ? 0.85 : 0.1;
  const totalConfidence = total ? 0.9 : 0.1;
  const dateConfidence = date ? 0.8 : 0.1;
  const overallConfidence = (vendorConfidence + totalConfidence + dateConfidence) / 3;
  
  console.log(`✅ Results - Vendor: ${vendor}, Total: $${total}, Date: ${date}`);
  
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

// Main handler
serve(async (req) => {
  const startTime = Date.now();
  console.log('[INFO] Receipt processing request received');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate request
    const requestValidation = validateRequest(req);
    if (!requestValidation.isValid) {
      return createErrorResponse(
        requestValidation.error || 'Invalid request',
        'INVALID_REQUEST',
        [],
        corsHeaders
      );
    }
    
    // Parse request
    const requestData = await req.json();
    const { imageUrl, testMode = false } = requestData;
    
    let result;
    let fromCache = false;
    
    // Debug mode
    if (testMode === 'debug') {
      const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
      if (!apiKey) {
        return createErrorResponse('OCR not configured', 'SERVICE_UNAVAILABLE', [], corsHeaders);
      }
      
      console.log('[DEBUG MODE] Getting raw OCR text...');
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { source: { imageUri: imageUrl } },
                features: [
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ]
            }]
          })
        }
      );
      
      const visionData = await visionResponse.json();
      const docText = visionData.responses?.[0]?.fullTextAnnotation?.text;
      const simpleText = visionData.responses?.[0]?.textAnnotations?.[0]?.description;
      const text = docText || simpleText || 'No text found';
      
      return new Response(
        JSON.stringify({
          success: true,
          debug_mode: true,
          raw_text: text,
          first_10_lines: text.split('\n').slice(0, 10),
          text_length: text.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Test mode
    if (testMode) {
      result = parseReceiptSimple(`
        HOME DEPOT
        Store #1234
        Total: $45.67
        Date: 2024-01-15
      `);
    } else {
      // Check cache
      const cachedResult = await checkCache(imageUrl);
      
      if (cachedResult) {
        result = cachedResult;
        fromCache = true;
        console.log('[INFO] Using cached result');
      } else {
        // Call Vision API
        const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
        if (!apiKey) {
          return createErrorResponse('OCR not configured', 'SERVICE_UNAVAILABLE', [], corsHeaders);
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
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ]
              }]
            })
          }
        );
        
        if (!visionResponse.ok) {
          const errorText = await visionResponse.text();
          console.error(`[ERROR] Vision API: ${errorText}`);
          return createErrorResponse('OCR error', 'OCR_SERVICE_ERROR', [], corsHeaders);
        }
        
        const visionData = await visionResponse.json();
        console.log('[INFO] Vision API response received');
        
        // Get text
        const docText = visionData.responses?.[0]?.fullTextAnnotation?.text;
        const simpleText = visionData.responses?.[0]?.textAnnotations?.[0]?.description;
        const text = docText || simpleText || '';
        
        console.log('================== RAW OCR TEXT ==================');
        console.log(text);
        console.log('================== END RAW TEXT ==================');
        
        result = parseReceiptSimple(text);
        
        // Save to cache
        await saveToCache(imageUrl, result);
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Completed in ${processingTime}ms ${fromCache ? '(cached)' : ''}`);
    
    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        processing_time: processingTime,
        from_cache: fromCache
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[ERROR] Processing failed: ${error.message}`);
    return createErrorResponse('Processing failed', 'INTERNAL_ERROR', [], corsHeaders);
  }
});
