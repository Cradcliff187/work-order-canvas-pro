import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import enhanced modular components
import { findVendor } from "./lib/vendor-detection.ts";
import { parseReceiptDate } from "./lib/date-parsing.ts";
import { calculateOverallConfidence, getExtractionQuality, calculateBaseConfidence, FieldConfidence } from "./lib/confidence-scoring.ts";
import { validateRequest, validateResponse, createErrorResponse, getUserFriendlyMessage } from "./lib/validation.ts";
import { detectDocumentType } from "./lib/document-types.ts";
import { extractLineItems, LineItem } from "./lib/line-item-parser.ts";
import { parseAmounts } from "./lib/amount-parser.ts";
import { logDebug, createDebugLog, processWithTestMode, ProcessingMetrics, DebugLog, SAMPLE_DOCUMENTS } from "./lib/text-processing.ts";
import { parseReceiptText } from "./lib/parseReceiptText.ts";

// Import new spatial processing modules
import { parseVisionApiResponse, VisionApiResponse } from "./lib/vision-api-spatial.ts";
import { runSpatialExtraction } from "./lib/spatial-extraction.ts";
import { runUniversalValidation, runAutoFix, recoverFromErrors, boostConfidenceForQuality } from "./lib/universal-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced interfaces
type ExtractionMethod = 'direct_ocr' | 'pattern_match' | 'fuzzy_match' | 'calculated' | 'inferred' | 'fallback';

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
    overall?: number;
  };
  confidence_details?: {
    vendor?: FieldConfidence;
    total?: FieldConfidence;
    date?: FieldConfidence;
    lineItems?: FieldConfidence;
    document_type?: FieldConfidence;
  };
  extraction_quality?: 'excellent' | 'good' | 'fair' | 'poor';
  validation_passed?: boolean;
}

// Enhanced parsing function using spatial extraction
function parseReceiptWithSpatial(visionResponse: VisionApiResponse): OCRResult {
  console.log('🚀 Starting spatial OCR parsing with Vision API structured data...');
  
  // Step 1: Run spatial extraction
  const extractionResult = runSpatialExtraction(visionResponse);
  
  // Step 2: Convert to OCRResult format
  const result: OCRResult = {
    vendor: extractionResult.merchant || '',
    vendor_raw: extractionResult.merchant || '',
    total: extractionResult.total || 0,
    subtotal: undefined, // Will be calculated if available
    tax: undefined, // Will be calculated if available
    date: extractionResult.date || new Date().toISOString().split('T')[0],
    lineItems: extractionResult.lineItems || [],
    document_type: 'receipt',
    document_confidence: 0.9,
    confidence: {
      vendor: extractionResult.merchant_confidence || 0,
      total: extractionResult.total_confidence || 0,
      date: extractionResult.date_confidence || 0,
      lineItems: extractionResult.lineItems_confidence || 0,
      overall: extractionResult.overall_confidence
    },
    confidence_details: {
      vendor: { 
        score: extractionResult.merchant_confidence || 0, 
        method: 'spatial_analysis' as ExtractionMethod,
        source: 'top_section_largest_font',
        validated: true
      },
      total: { 
        score: extractionResult.total_confidence || 0, 
        method: 'spatial_analysis' as ExtractionMethod,
        source: 'keyword_proximity_spatial',
        validated: extractionResult.spatial_validation.mathematical_consistency
      },
      date: { 
        score: extractionResult.date_confidence || 0, 
        method: 'spatial_analysis' as ExtractionMethod,
        validated: true
      },
      lineItems: { 
        score: extractionResult.lineItems_confidence || 0, 
        method: 'spatial_analysis' as ExtractionMethod,
        source: 'spatial_table_construction'
      },
      document_type: { 
        score: 0.9, 
        method: 'pattern_match' as ExtractionMethod
      }
    },
    extraction_quality: getExtractionQuality(extractionResult.overall_confidence),
    validation_passed: extractionResult.spatial_validation.mathematical_consistency
  };

  // Step 3: Run universal validation
  const validation = runUniversalValidation(result, {
    documentType: 'receipt',
    vendor: result.vendor,
    currency: 'USD',
    locale: 'en-US'
  });

  // Step 4: Apply auto-fixes if needed
  if (!validation.valid && validation.issues.some(i => i.autoFixable)) {
    console.log('🔧 Applying auto-fixes...');
    const fixedResult = runAutoFix(result);
    Object.assign(result, fixedResult);
  }

  // Step 5: Apply error recovery if still invalid
  if (!validation.valid) {
    console.log('🔄 Applying error recovery...');
    const recoveredResult = recoverFromErrors(result, validation.issues);
    Object.assign(result, recoveredResult);
  }

  // Step 6: Boost confidence for high-quality text
  const qualityBoostedResult = boostConfidenceForQuality(result, result.extraction_quality || 'fair');
  Object.assign(result, qualityBoostedResult);

  console.log(`🎯 Spatial parsing complete - Method: ${extractionResult.extraction_method}, Overall confidence: ${result.confidence!.overall?.toFixed(3)} (${result.extraction_quality})`);
  
  return result;
}

// Main request handler
serve(async (req) => {
  const startTime = Date.now();
  const debugLogs: DebugLog[] = [];
  const metrics: ProcessingMetrics = { startTime };
  
  logDebug(debugLogs, 'INFO', 'REQUEST_START', 'OCR processing request received with modular architecture');

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
        debugLogs,
        corsHeaders
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { imageUrl, testMode = false, testDocument = 'home_depot' } = requestData;
    
    // Get Vision API response with spatial data
    let result: OCRResult;
    
    if (testMode) {
      // For test mode, create mock spatial data
      const testResult = await processWithTestMode(testMode, testDocument, debugLogs);
      if (!testResult.text) {
        return createErrorResponse(
          `Invalid test document: ${testDocument}`,
          'INVALID_TEST_DOCUMENT',
          debugLogs,
          corsHeaders
        );
      }
      
      // Create mock vision response for test mode
      const mockVisionResponse: VisionApiResponse = {
        pages: [{
          width: 800,
          height: 1200,
          confidence: 0.9,
          blocks: [] // Simplified for test mode
        }],
        text: testResult.text,
        confidence: 0.9
      };
      
      // Use fallback text parsing for test mode
      result = parseReceiptText(testResult.text);
      
    } else {
      // Full Vision API call with DOCUMENT_TEXT_DETECTION
      const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
      if (!apiKey) {
        return createErrorResponse(
          'OCR service not configured',
          'SERVICE_UNAVAILABLE',
          debugLogs,
          corsHeaders
        );
      }
      
      logDebug(debugLogs, 'INFO', 'VISION_API_CALL', 'Calling Google Vision API with DOCUMENT_TEXT_DETECTION');
      
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
        logDebug(debugLogs, 'ERROR', 'VISION_API_ERROR', `Vision API error: ${errorText}`);
        return createErrorResponse(
          'OCR service error',
          'OCR_SERVICE_ERROR',
          debugLogs,
          corsHeaders
        );
      }

      const visionData = await visionResponse.json();
      logDebug(debugLogs, 'INFO', 'VISION_API_SUCCESS', 'Vision API response received');
      
      try {
        // Parse structured Vision API response
        const parsedVisionResponse = parseVisionApiResponse(visionData);
        
        // Use spatial extraction
        result = parseReceiptWithSpatial(parsedVisionResponse);
        
      } catch (spatialError) {
        // Fallback to text-only extraction if spatial parsing fails
        logDebug(debugLogs, 'WARN', 'SPATIAL_FALLBACK', `Spatial parsing failed: ${spatialError.message}, falling back to text extraction`);
        
        const fallbackText = visionData.responses?.[0]?.textAnnotations?.[0]?.description || '';
        result = parseReceiptText(fallbackText);
      }
    }
    
    // Validate response quality
    const validation = validateResponse(result);
    
    // Return successful response
    return new Response(JSON.stringify({
      success: true,
      ...result,
      debug_logs: debugLogs,
      processing_time: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logDebug(debugLogs, 'ERROR', 'PROCESSING_ERROR', error.message);
    return createErrorResponse(
      'Processing failed',
      'INTERNAL_ERROR',
      debugLogs,
      corsHeaders
    );
  }
});