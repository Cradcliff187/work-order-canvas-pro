import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import modular components
import { findVendor } from "./lib/vendor-detection.ts";
import { parseReceiptDate } from "./lib/date-parsing.ts";
import { calculateOverallConfidence, getExtractionQuality, calculateBaseConfidence, FieldConfidence } from "./lib/confidence-scoring.ts";
import { validateRequest, validateResponse, createErrorResponse, getUserFriendlyMessage } from "./lib/validation.ts";
import { detectDocumentType } from "./lib/document-types.ts";
import { extractLineItems, LineItem } from "./lib/line-item-parser.ts";
import { parseAmounts } from "./lib/amount-parser.ts";
import { logDebug, createDebugLog, processWithTestMode, ProcessingMetrics, DebugLog, SAMPLE_DOCUMENTS } from "./lib/text-processing.ts";

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

// Main parsing function using modular components
function parseReceiptText(text: string): OCRResult {
  console.log('🔍 Starting enhanced OCR parsing with modular approach...');
  
  // Initialize result with proper confidence structure
  const result: OCRResult = {
    vendor: '',
    total: 0,
    date: '',
    confidence: {
      vendor: 0,
      total: 0,
      date: 0,
      lineItems: 0,
      overall: 0
    }
  };

  // Initialize confidence details
  result.confidence_details = {
    vendor: { score: 0, method: 'direct_ocr' as ExtractionMethod },
    total: { score: 0, method: 'pattern_match' as ExtractionMethod },
    date: { score: 0, method: 'pattern_match' as ExtractionMethod },
    lineItems: { score: 0, method: 'pattern_match' as ExtractionMethod },
    document_type: { score: 0, method: 'pattern_match' as ExtractionMethod }
  };

  // Detect document type
  const docType = detectDocumentType(text);
  result.document_type = docType.document_type;
  result.document_confidence = docType.document_confidence;

  // Extract vendor using modular vendor detection
  const vendorResult = findVendor(text);
  if (vendorResult.vendor) {
    result.vendor = vendorResult.vendor;
    result.vendor_raw = vendorResult.vendor_raw;
    result.confidence!.vendor = vendorResult.confidence;
    result.confidence_details!.vendor = {
      score: vendorResult.confidence,
      method: vendorResult.method,
      source: vendorResult.source,
      position: vendorResult.position
    };
    console.log(`✅ Found vendor: ${result.vendor} (confidence: ${vendorResult.confidence.toFixed(3)})`);
  }

  // Extract amounts using modular amount parser
  const amounts = parseAmounts(text);
  if (amounts.total) {
    result.total = amounts.total;
    result.confidence!.total = amounts.total_confidence || 0.8;
  }
  if (amounts.subtotal) result.subtotal = amounts.subtotal;
  if (amounts.tax) result.tax = amounts.tax;

  // Extract line items using modular line item parser
  result.lineItems = extractLineItems(text);
  
  // Calculate line items confidence
  let lineItemsConfidence = 0.0;
  if (result.lineItems && result.lineItems.length > 0) {
    const avgConfidence = result.lineItems.reduce((sum, item) => sum + (item.confidence || 0.5), 0) / result.lineItems.length;
    lineItemsConfidence = Math.min(0.5 + (avgConfidence * 0.4), 0.9);
  }
  result.confidence!.lineItems = lineItemsConfidence;

  // Extract date using modular date parser
  const dateResult = parseReceiptDate(text);
  if (dateResult.date) {
    result.date = dateResult.date;
    result.confidence!.date = dateResult.confidence;
    result.confidence_details!.date = {
      score: dateResult.confidence,
      method: 'pattern_match' as ExtractionMethod,
      source: dateResult.format,
      validated: true
    };
  } else {
    result.date = new Date().toISOString().split('T')[0];
    result.confidence!.date = 0.3;
  }

  // Calculate overall confidence and quality
  const overallConfidence = calculateOverallConfidence({
    vendor: result.confidence!.vendor,
    total: result.confidence!.total,
    date: result.confidence!.date,
    lineItems: result.confidence!.lineItems,
    document_confidence: result.document_confidence
  });
  
  result.confidence!.overall = overallConfidence;
  result.extraction_quality = getExtractionQuality(overallConfidence);
  result.validation_passed = (result.confidence!.vendor || 0) > 0.5 && (result.confidence!.total || 0) > 0.5;

  console.log(`🎯 Modular parsing complete - Overall confidence: ${overallConfidence.toFixed(3)} (${result.extraction_quality})`);
  
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