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

// Import new universal processing modules
import { runMultiStrategyExtraction } from "./lib/multi-strategy-extraction.ts";
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

// Universal parsing function using multi-strategy extraction
function parseReceiptText(text: string): OCRResult {
  console.log('🚀 Starting universal OCR parsing with multi-strategy approach...');
  
  // Step 1: Run multi-strategy extraction
  const extractionResult = runMultiStrategyExtraction(text);
  
  // Step 2: Convert to OCRResult format
  const result: OCRResult = {
    vendor: extractionResult.vendor || '',
    vendor_raw: extractionResult.vendor || '',
    total: extractionResult.total || 0,
    subtotal: extractionResult.subtotal,
    tax: extractionResult.tax,
    date: extractionResult.date || new Date().toISOString().split('T')[0],
    lineItems: extractionResult.lineItems || [],
    document_type: 'receipt',
    document_confidence: 0.8,
    confidence: {
      vendor: extractionResult.vendor_confidence || 0,
      total: extractionResult.total_confidence || 0,
      date: extractionResult.date_confidence || 0,
      lineItems: extractionResult.lineItems && extractionResult.lineItems.length > 0 ? 0.7 : 0,
      overall: extractionResult.overall_confidence
    },
    confidence_details: {
      vendor: { 
        score: extractionResult.vendor_confidence || 0, 
        method: 'multi_strategy' as ExtractionMethod,
        source: extractionResult.extraction_methods.join(', ')
      },
      total: { 
        score: extractionResult.total_confidence || 0, 
        method: 'multi_strategy' as ExtractionMethod,
        source: extractionResult.extraction_methods.join(', ')
      },
      date: { 
        score: extractionResult.date_confidence || 0, 
        method: 'multi_strategy' as ExtractionMethod,
        validated: true
      },
      lineItems: { 
        score: extractionResult.lineItems && extractionResult.lineItems.length > 0 ? 0.7 : 0, 
        method: 'multi_strategy' as ExtractionMethod
      },
      document_type: { 
        score: 0.8, 
        method: 'pattern_match' as ExtractionMethod
      }
    },
    extraction_quality: getExtractionQuality(extractionResult.overall_confidence),
    validation_passed: extractionResult.validation_passed
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

  console.log(`🎯 Universal parsing complete - Methods: [${extractionResult.extraction_methods.join(', ')}], Overall confidence: ${result.confidence!.overall.toFixed(3)} (${result.extraction_quality})`);
  
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
    
    // Get text (test mode or Vision API)
    let fullText: string;
    if (testMode) {
      const testResult = await processWithTestMode(testMode, testDocument, debugLogs);
      fullText = testResult.text;
      if (!fullText) {
        return createErrorResponse(
          `Invalid test document: ${testDocument}`,
          'INVALID_TEST_DOCUMENT',
          debugLogs,
          corsHeaders
        );
      }
    } else {
      // Vision API call (simplified for time)
      const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
      if (!apiKey) {
        return createErrorResponse(
          'OCR service not configured',
          'SERVICE_UNAVAILABLE',
          debugLogs,
          corsHeaders
        );
      }
      
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { source: { imageUri: imageUrl } },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 1 },
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
              ]
            }]
          })
        }
      );

      if (!visionResponse.ok) {
        return createErrorResponse(
          'OCR service error',
          'OCR_SERVICE_ERROR',
          debugLogs,
          corsHeaders
        );
      }

      const visionData = await visionResponse.json();
      fullText = visionData.responses?.[0]?.textAnnotations?.[0]?.description || '';
    }

    // Parse using modular approach
    const result = parseReceiptText(fullText);
    
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