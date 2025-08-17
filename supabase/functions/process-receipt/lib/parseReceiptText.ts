// Text-based parsing function for fallback scenarios

import { runTextFallback } from "./text-fallback.ts";
import { runUniversalValidation, runAutoFix, recoverFromErrors, boostConfidenceForQuality } from "./universal-validation.ts";
import { getExtractionQuality, FieldConfidence } from "./confidence-scoring.ts";

type ExtractionMethod = 'direct_ocr' | 'pattern_match' | 'fuzzy_match' | 'calculated' | 'inferred' | 'fallback';

interface OCRResult {
  vendor?: string;
  vendor_raw?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  lineItems?: any[];
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

export function parseReceiptText(text: string): OCRResult {
  console.log('📝 Starting text-based OCR parsing (fallback mode)...');
  
  // Step 1: Run text fallback extraction
  const extractionResult = runTextFallback(text);
  
  // Step 2: Convert to OCRResult format
  const result: OCRResult = {
    vendor: extractionResult.vendor || '',
    vendor_raw: extractionResult.vendor || '',
    total: extractionResult.total || 0,
    subtotal: undefined,
    tax: undefined,
    date: extractionResult.date || new Date().toISOString().split('T')[0],
    lineItems: extractionResult.lineItems || [],
    document_type: 'receipt',
    document_confidence: 0.7, // Lower confidence for fallback
    confidence: {
      vendor: extractionResult.vendor_confidence || 0,
      total: extractionResult.total_confidence || 0,
      date: extractionResult.date_confidence || 0,
      lineItems: extractionResult.lineItems_confidence || 0,
      overall: extractionResult.overall_confidence
    },
    confidence_details: {
      vendor: { 
        score: extractionResult.vendor_confidence || 0, 
        method: 'pattern_match' as ExtractionMethod,
        source: 'text_fallback'
      },
      total: { 
        score: extractionResult.total_confidence || 0, 
        method: 'pattern_match' as ExtractionMethod,
        source: 'text_fallback'
      },
      date: { 
        score: extractionResult.date_confidence || 0, 
        method: 'pattern_match' as ExtractionMethod,
        validated: true
      },
      lineItems: { 
        score: extractionResult.lineItems_confidence || 0, 
        method: 'pattern_match' as ExtractionMethod
      },
      document_type: { 
        score: 0.7, 
        method: 'pattern_match' as ExtractionMethod
      }
    },
    extraction_quality: getExtractionQuality(extractionResult.overall_confidence),
    validation_passed: false // Will be determined by validation
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

  console.log(`📝 Text parsing complete - Method: ${extractionResult.extraction_method}, Overall confidence: ${result.confidence!.overall?.toFixed(3)} (${result.extraction_quality})`);
  
  return result;
}