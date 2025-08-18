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

// Simple parser for test mode
function parseReceiptSimple(text: string) {
  console.log('🧪 Using simple test parser...');
  
  const vendorResult = findVendor(text);
  const dateResult = parseReceiptDate(text);
  const amountResult = parseAmounts(text);
  
  return {
    vendor: vendorResult.name || 'Test Vendor',
    total: amountResult.total || 0,
    date: dateResult.date || new Date().toISOString().split('T')[0],
    subtotal: amountResult.grandTotal || 0,
    tax: null,
    lineItems: [],
    document_type: 'receipt',
    confidence: {
      vendor: vendorResult.confidence || 0.8,
      total: amountResult.confidence || 0.8,
      date: dateResult.confidence || 0.8,
      lineItems: 0,
      overall: 0.8
    },
    extraction_method: 'simple_test'
  };
}

// Parse receipt using Google Vision + Custom Parsing Libraries
function parseReceiptWithCustomParsers(text: string) {
  console.log('🔍 Using Google Vision + Custom Parsing...');
  
  // Use existing parsing libraries
  const vendorResult = findVendor(text);
  const dateResult = parseReceiptDate(text);
  const amountResult = parseAmounts(text);
  
  // Extract confidence from new return structures
  const confidence = {
    vendor: vendorResult.confidence || 0.3,
    total: amountResult.confidence || 0.3,
    date: dateResult.confidence || 0.3,
    lineItems: 0, // Not implemented in custom parsers
    overall: 0
  };
  
  // Calculate weighted overall confidence
  confidence.overall = (
    confidence.vendor * 0.3 +
    confidence.total * 0.4 +
    confidence.date * 0.2 +
    confidence.lineItems * 0.1
  );
  
  // Create warnings for low confidence fields
  const warnings = {
    low_vendor_confidence: confidence.vendor < 0.6,
    low_amount_confidence: confidence.total < 0.6,
    low_date_confidence: confidence.date < 0.6,
    fallback_date_used: confidence.date <= 0.3
  };
  
  const hasWarnings = Object.values(warnings).some(w => w);
  if (hasWarnings) {
    console.log('[PARSER] ⚠️ Warnings generated:', warnings);
  }
  
  const result = {
    vendor: vendorResult.name || 'Unknown Vendor',
    total: amountResult.total || 0,
    date: dateResult.date || new Date().toISOString().split('T')[0],
    subtotal: amountResult.grandTotal || amountResult.total || 0,
    tax: null, // Custom parser doesn't extract tax separately yet
    lineItems: [], // Custom parser doesn't extract line items yet
    document_type: 'receipt',
    confidence,
    warnings: hasWarnings ? warnings : undefined,
    extraction_method: 'google_vision_custom_parsing'
  };
  
  console.log('✅ Custom Parsing Results:', {
    vendor: result.vendor,
    total: result.total,
    date: result.date,
    confidence: result.confidence.overall
  });
  
  return result;
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
        
        result = parseReceiptWithCustomParsers(text);
        
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
