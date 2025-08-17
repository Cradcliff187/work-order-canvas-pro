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

// Parse receipt using OpenAI LLM
async function parseReceiptWithLLM(text: string) {
  console.log('🚀 Starting LLM receipt parsing...');
  
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('❌ OpenAI API key not found');
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Parse this receipt text and extract the information in JSON format. The text was extracted from an OCR scan, so some formatting may be off.

Receipt text:
"""
${text}
"""

Return ONLY a valid JSON object with this exact structure:
{
  "vendor": "store name (e.g., Home Depot, Walmart, etc.)",
  "total": 123.45,
  "date": "YYYY-MM-DD",
  "subtotal": 123.45,
  "tax": 12.34,
  "lineItems": [
    {"description": "item name", "amount": 12.34},
    {"description": "item name", "amount": 56.78}
  ],
  "confidence": 0.9
}

Rules:
- Extract the final TOTAL amount (not subtotal)
- Format date as YYYY-MM-DD
- Include individual line items with descriptions and amounts
- Set confidence between 0.0-1.0 based on how clear the data is
- If a field cannot be determined, use null
- Return ONLY the JSON object, no explanation`;

  try {
    console.log('🤖 Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a receipt parsing expert. Extract information accurately from OCR text and return only valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const llmResponse = data.choices[0].message.content.trim();
    console.log('🤖 LLM Raw Response:', llmResponse);

    // Parse the JSON response
    let parsedResult;
    try {
      // Remove any potential markdown formatting
      const cleanJson = llmResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      parsedResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw LLM response:', llmResponse);
      throw new Error('Failed to parse LLM response as JSON');
    }

    console.log('✅ LLM Results:', {
      vendor: parsedResult.vendor,
      total: parsedResult.total,
      date: parsedResult.date,
      lineItems: parsedResult.lineItems?.length || 0
    });

    // Ensure proper structure and types
    return {
      vendor: parsedResult.vendor || 'Unknown Vendor',
      total: parsedResult.total || 0,
      date: parsedResult.date || null,
      lineItems: parsedResult.lineItems || [],
      subtotal: parsedResult.subtotal || null,
      tax: parsedResult.tax || null,
      document_type: 'receipt',
      confidence: {
        vendor: parsedResult.vendor ? 0.9 : 0.1,
        total: parsedResult.total ? 0.95 : 0.1,
        date: parsedResult.date ? 0.9 : 0.1,
        lineItems: (parsedResult.lineItems?.length || 0) > 0 ? 0.9 : 0.1,
        overall: parsedResult.confidence || 0.8
      }
    };

  } catch (error) {
    console.error('❌ LLM parsing failed:', error);
    throw error;
  }
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
        
        result = await parseReceiptWithLLM(text);
        
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
