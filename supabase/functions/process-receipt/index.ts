import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation interfaces
interface RequestValidation {
  isValid: boolean;
  error?: string;
  sanitizedImageUrl?: string;
}

interface ProcessingMetrics {
  startTime: number;
  ocrTime?: number;
  parsingTime?: number;
  totalTime?: number;
  memoryUsage?: number;
}

interface DebugLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  step: string;
  message: string;
  data?: any;
  processingTime?: number;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number;
}

// Sample test documents for testing mode
const SAMPLE_DOCUMENTS = {
  home_depot: {
    text: `THE HOME DEPOT #1234
123 MAIN STREET
AUSTIN TX 78701

05/15/2024 2:45 PM

CASHIER: JOHN DOE

DESCRIPTION                  QTY   PRICE
------------------------    ----  ------
2X4 LUMBER 8FT              4     $6.47
SCREWS DECK 2.5"            1     $12.99
DRILL BIT SET               1     $19.99
SANDPAPER 220 GRIT          2     $4.25

SUBTOTAL                          $52.68
TAX                               $4.32
TOTAL                            $57.00

PAYMENT METHOD: CREDIT CARD
THANK YOU FOR SHOPPING AT THE HOME DEPOT`,
    expectedVendor: 'Home Depot',
    expectedTotal: 57.00
  },
  lowes: {
    text: `LOWE'S HOME IMPROVEMENT
STORE #2567
456 OAK AVENUE
DALLAS TX 75201

06/22/2024 11:30 AM

ITEM                         QTY   AMOUNT
----                        ----   ------
PAINT PRIMER GALLON         2     $28.98
PAINT BRUSH 3"              1     $8.99
ROLLER TRAY                 1     $5.47
DROP CLOTH 9X12             1     $12.99

MERCHANDISE SUBTOTAL             $56.43
SALES TAX                        $4.51
TOTAL                           $60.94

VISA ****1234
THANK YOU!`,
    expectedVendor: 'Lowes',
    expectedTotal: 60.94
  }
};

// User-friendly error message mapping
function getUserFriendlyMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'NETWORK_ERROR': 'Connection problem. Please check your internet and try again.',
    'OCR_SERVICE_ERROR': 'Our scanning service is temporarily unavailable. You can enter details manually.',
    'NO_TEXT_DETECTED': 'No text found in your image. Make sure the receipt is clearly visible.',
    'POOR_IMAGE_QUALITY': 'Image quality is too low. Please take a clearer photo.',
    'FILE_TOO_LARGE': 'Image file is too large. Please use a smaller file.',
    'INVALID_FILE_TYPE': 'Please upload an image file (JPG, PNG, WebP, or HEIC).',
    'PROCESSING_TIMEOUT': 'Processing took too long. Try a clearer image or enter details manually.',
    'INSUFFICIENT_TEXT': 'Not enough readable text found. Please provide a clearer image.',
    'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',
    'INTERNAL_ERROR': 'Something went wrong. Please try again or enter details manually.'
  };
  return messages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Logging utility
function createDebugLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', step: string, message: string, data?: any, startTime?: number): DebugLog {
  const timestamp = new Date().toISOString();
  const processingTime = startTime ? Date.now() - startTime : undefined;
  return { timestamp, level, step, message, data, processingTime };
}

function logDebug(logs: DebugLog[], level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', step: string, message: string, data?: any, startTime?: number): void {
  const log = createDebugLog(level, step, message, data, startTime);
  logs.push(log);
  console.log(`[${log.level}] ${log.step}: ${log.message}`, log.data ? JSON.stringify(log.data, null, 2) : '');
}

// Enhanced interfaces for confidence tracking
type ExtractionMethod = 'direct_ocr' | 'pattern_match' | 'fuzzy_match' | 'calculated' | 'inferred' | 'fallback';

interface FieldConfidence {
  score: number;
  method: ExtractionMethod;
  source?: string;
  position?: number;
  validated?: boolean;
}

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
  confidence?: number;
}

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

// Vendor normalization map
const VENDOR_ALIASES: Record<string, string[]> = {
  'Home Depot': ['HD', 'HOME DEPOT', 'HOMEDEPOT', 'THE HOME DEPOT', 'HOME\\s*DEPOT'],
  'Lowes': ['LOWES', 'LOWE\'S', 'LOWE S', 'LOWES HOME IMPROVEMENT'],
  'Walmart': ['WALMART', 'WAL-MART', 'WAL MART', 'WMT', 'WALMART SUPERCENTER'],
  'Target': ['TARGET', 'TGT', 'TARGET CORP'],
  'Costco': ['COSTCO', 'COSTCO WHOLESALE'],
  'Sams Club': ['SAM\'S CLUB', 'SAMS CLUB', 'SAMSCLUB'],
  'Harbor Freight': ['HARBOR FREIGHT', 'HARBOR FREIGHT TOOLS', 'HF', 'HARBORFREIGHT'],
  'Ace Hardware': ['ACE HARDWARE', 'ACE', 'ACE HDW'],
  'Menards': ['MENARDS', 'MENARD\'S'],
  'Best Buy': ['BEST BUY', 'BESTBUY'],
  'CVS': ['CVS', 'CVS PHARMACY', 'CVS/PHARMACY'],
  'Walgreens': ['WALGREENS', 'WALGREEN'],
  'Kroger': ['KROGER', 'KROGER CO'],
  'Safeway': ['SAFEWAY'],
  'Whole Foods': ['WHOLE FOODS', 'WHOLEFOODS', 'WHOLE FOODS MARKET'],
  'Dollar General': ['DOLLAR GENERAL', 'DG', 'DOLLARGENERAL'],
  'Dollar Tree': ['DOLLAR TREE', 'DOLLARTREE'],
  'RadioShack': ['RADIOSHACK', 'RADIO SHACK'],
  'H-E-B': ['HEB', 'H-E-B', 'H E B'],
  'Tractor Supply': ['TRACTOR SUPPLY', 'TSC', 'TRACTORSUPPLY']
};

function normalizeVendorText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^\w\s-']/g, ' ') // Remove special chars except hyphens and apostrophes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Early return for same strings
  if (str1 === str2) return 0;
  
  // Early return for empty strings
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // Early termination for very different lengths (optimization)
  if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.3) {
    return Math.max(len1, len2);
  }
  
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

// Confidence calculation utilities
function calculateBaseConfidence(method: ExtractionMethod, hasValidation: boolean = false): number {
  const baseScores = {
    'direct_ocr': 0.9,
    'pattern_match': 0.8,
    'fuzzy_match': 0.65,
    'calculated': 0.7,
    'inferred': 0.5,
    'fallback': 0.3
  };
  
  let score = baseScores[method];
  if (hasValidation) score *= 1.15; // Boost for cross-validation
  return Math.min(score, 0.95);
}

function calculateOverallConfidence(confidence: any): number {
  // Weighted average based on field importance
  const weights = {
    vendor: 0.20,
    total: 0.30,
    date: 0.15,
    lineItems: 0.25,
    document_type: 0.10
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  if (confidence.vendor !== undefined) {
    weightedSum += confidence.vendor * weights.vendor;
    totalWeight += weights.vendor;
  }
  
  if (confidence.total !== undefined) {
    weightedSum += confidence.total * weights.total;
    totalWeight += weights.total;
  }
  
  if (confidence.date !== undefined) {
    weightedSum += confidence.date * weights.date;
    totalWeight += weights.date;
  }
  
  if (confidence.lineItems !== undefined) {
    weightedSum += confidence.lineItems * weights.lineItems;
    totalWeight += weights.lineItems;
  }
  
  // Document type confidence from document_confidence field
  if (confidence.document_confidence !== undefined) {
    weightedSum += confidence.document_confidence * weights.document_type;
    totalWeight += weights.document_type;
  }
  
  const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Apply penalties for missing critical fields
  let penalty = 0;
  if (!confidence.vendor || confidence.vendor < 0.5) penalty += 0.1;
  if (!confidence.total || confidence.total < 0.5) penalty += 0.15;
  if (!confidence.date || confidence.date < 0.5) penalty += 0.05;
  
  return Math.max(overall - penalty, 0);
}

function getExtractionQuality(overallConfidence: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (overallConfidence >= 0.8) return 'excellent';
  if (overallConfidence >= 0.65) return 'good';
  if (overallConfidence >= 0.45) return 'fair';
  return 'poor';
}

function findVendor(text: string): { vendor: string; vendor_raw: string; confidence: number; method: ExtractionMethod; source: string; position: number } {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const fullTextNormalized = normalizeVendorText(text);
  
  let bestMatch = { vendor: '', vendor_raw: '', confidence: 0, method: 'direct_ocr' as ExtractionMethod, source: '', position: -1 };
  
  // Phase 1: Exact matching (existing logic)
  for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
    for (const alias of aliases) {
      const aliasRegex = new RegExp(alias.replace(/\s/g, '\\s*'), 'gi');
      
      // Check full text first
      const fullTextMatch = fullTextNormalized.match(aliasRegex);
      if (fullTextMatch) {
        const confidence = alias === vendorName ? 0.95 : 0.85;
        if (confidence > bestMatch.confidence) {
          bestMatch = { 
            vendor: vendorName, 
            vendor_raw: fullTextMatch[0], 
            confidence,
            method: 'pattern_match' as ExtractionMethod,
            source: fullTextMatch[0],
            position: 0
          };
        }
      }
      
      // Check first 5 lines for better accuracy
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const lineNormalized = normalizeVendorText(lines[i]);
        const lineMatch = lineNormalized.match(aliasRegex);
        if (lineMatch) {
          const confidence = alias === vendorName ? 0.9 : 0.8;
          if (confidence > bestMatch.confidence) {
            bestMatch = { 
              vendor: vendorName, 
              vendor_raw: lines[i], 
              confidence,
              method: 'pattern_match' as ExtractionMethod,
              source: lines[i],
              position: i
            };
          }
        }
      }
    }
  }
  
  // Handle special case for Home Depot multi-line pattern (HO\nDEPOT)
  const homeDepotMultiline = /HO\s*\n\s*DEPOT/i;
  if (homeDepotMultiline.test(text)) {
    const match = text.match(homeDepotMultiline);
    if (match && 0.9 > bestMatch.confidence) {
      bestMatch = { 
        vendor: 'Home Depot', 
        vendor_raw: match[0], 
        confidence: 0.9,
        method: 'pattern_match' as ExtractionMethod,
        source: match[0],
        position: 0
      };
    }
  }
  
  // Phase 2: Fuzzy matching (only if no good exact match found)
  if (bestMatch.confidence < 0.8) {
    console.log('Attempting fuzzy vendor matching...');
    
    // Prepare text candidates for fuzzy matching
    const textCandidates: string[] = [];
    
    // Add first 5 lines as candidates
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const normalized = normalizeVendorText(lines[i]);
      if (normalized.length >= 3) { // Only consider meaningful text
        textCandidates.push(normalized);
      }
    }
    
    // Add words from full text (for partial vendor names)
    const words = fullTextNormalized.split(/\s+/).filter(word => word.length >= 3);
    textCandidates.push(...words.slice(0, 10)); // Limit to first 10 words
    
    let bestFuzzyMatch = { vendor: '', vendor_raw: '', confidence: 0, similarity: 0 };
    
    // Test each candidate against all vendors and aliases
    for (const candidate of textCandidates) {
      for (const [vendorName, aliases] of Object.entries(VENDOR_ALIASES)) {
        // Check against vendor name
        const vendorSimilarity = calculateSimilarity(candidate, normalizeVendorText(vendorName));
        if (vendorSimilarity >= 0.8) {
          const confidence = 0.65 + (vendorSimilarity - 0.8) * 0.15; // Scale 0.8-1.0 similarity to 0.65-0.8 confidence
          if (confidence > bestFuzzyMatch.confidence) {
            bestFuzzyMatch = {
              vendor: vendorName,
              vendor_raw: candidate,
              confidence,
              similarity: vendorSimilarity
            };
          }
        }
        
        // Check against aliases
        for (const alias of aliases) {
          const aliasSimilarity = calculateSimilarity(candidate, normalizeVendorText(alias));
          if (aliasSimilarity >= 0.8) {
            const confidence = 0.6 + (aliasSimilarity - 0.8) * 0.15; // Scale 0.8-1.0 similarity to 0.6-0.75 confidence
            if (confidence > bestFuzzyMatch.confidence) {
              bestFuzzyMatch = {
                vendor: vendorName,
                vendor_raw: candidate,
                confidence,
                similarity: aliasSimilarity
              };
            }
          }
        }
      }
    }
    
    // Update best match if fuzzy match is better
    if (bestFuzzyMatch.confidence > bestMatch.confidence) {
      console.log(`Fuzzy match found: "${bestFuzzyMatch.vendor}" (similarity: ${bestFuzzyMatch.similarity.toFixed(3)}, confidence: ${bestFuzzyMatch.confidence.toFixed(3)})`);
      bestMatch = {
        vendor: bestFuzzyMatch.vendor,
        vendor_raw: bestFuzzyMatch.vendor_raw,
        confidence: bestFuzzyMatch.confidence,
        method: 'fuzzy_match' as ExtractionMethod,
        source: bestFuzzyMatch.vendor_raw,
        position: 0
      };
    }
  }
  
  return bestMatch;
}

function parseReceiptDate(text: string): { date: string | null; confidence: number; format: string } {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const currentYear = new Date().getFullYear();
  
  // Comprehensive date patterns with format identification
  const datePatterns = [
    // US Format patterns (MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY)
    {
      regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g,
      format: 'US_FULL',
      confidence: 0.9,
      parser: (match: RegExpMatchArray) => {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        return { month, day, year, isAmbiguous: month <= 12 && day <= 12 };
      }
    },
    // US Format 2-digit year (MM/DD/YY)
    {
      regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})\b/g,
      format: 'US_SHORT',
      confidence: 0.8,
      parser: (match: RegExpMatchArray) => {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        const fullYear = year >= 30 ? 1900 + year : 2000 + year;
        return { month, day, year: fullYear, isAmbiguous: month <= 12 && day <= 12 };
      }
    },
    // ISO Format (YYYY-MM-DD, YYYY.MM.DD)
    {
      regex: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g,
      format: 'ISO',
      confidence: 0.95,
      parser: (match: RegExpMatchArray) => {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        return { month, day, year, isAmbiguous: false };
      }
    },
    // Named months (Jan 15 2024, January 15, 2024, 15 Jan 2024)
    {
      regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})\b/gi,
      format: 'NAMED_MONTH',
      confidence: 0.9,
      parser: (match: RegExpMatchArray) => {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthName = match[1].toLowerCase().substring(0, 3);
        const month = monthNames.indexOf(monthName) + 1;
        const day = parseInt(match[2]);
        let year = parseInt(match[3]);
        if (year < 100) year = year >= 30 ? 1900 + year : 2000 + year;
        return { month, day, year, isAmbiguous: false };
      }
    },
    // Reverse named months (15 Jan 2024)
    {
      regex: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{2,4})\b/gi,
      format: 'REVERSE_NAMED',
      confidence: 0.9,
      parser: (match: RegExpMatchArray) => {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const day = parseInt(match[1]);
        const monthName = match[2].toLowerCase().substring(0, 3);
        const month = monthNames.indexOf(monthName) + 1;
        let year = parseInt(match[3]);
        if (year < 100) year = year >= 30 ? 1900 + year : 2000 + year;
        return { month, day, year, isAmbiguous: false };
      }
    },
    // Compact formats (YYYYMMDD, DDMMYYYY)
    {
      regex: /\b(\d{8})\b/g,
      format: 'COMPACT',
      confidence: 0.7,
      parser: (match: RegExpMatchArray) => {
        const dateStr = match[1];
        // Try YYYYMMDD first
        if (dateStr.substring(0, 4) >= '1900' && dateStr.substring(0, 4) <= '2100') {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          return { month, day, year, isAmbiguous: false };
        }
        // Try DDMMYYYY
        const day = parseInt(dateStr.substring(0, 2));
        const month = parseInt(dateStr.substring(2, 4));
        const year = parseInt(dateStr.substring(4, 8));
        return { month, day, year, isAmbiguous: false };
      }
    }
  ];

  const candidates: Array<{
    date: Date;
    confidence: number;
    format: string;
    rawMatch: string;
    isAmbiguous: boolean;
  }> = [];

  console.log('🔍 Searching for dates with comprehensive patterns...');

  // Search through all text for date patterns
  for (const pattern of datePatterns) {
    const matches = Array.from(text.matchAll(pattern.regex));
    
    for (const match of matches) {
      try {
        const parsed = pattern.parser(match);
        const { month, day, year, isAmbiguous } = parsed;
        
        // Validate parsed components
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > currentYear + 1) {
          console.log(`❌ Invalid date components: ${month}/${day}/${year} from "${match[0]}"`);
          continue;
        }
        
        // Create date object and validate it's a real date
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
          console.log(`❌ Invalid date: ${match[0]} -> ${dateObj.toISOString()}`);
          continue;
        }
        
        // Check if date is reasonable for a receipt (not future, not too old)
        const now = new Date();
        const daysDiff = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < -1) { // More than 1 day in future
          console.log(`❌ Future date rejected: ${match[0]}`);
          continue;
        }
        
        if (daysDiff > 3650) { // More than 10 years old
          console.log(`❌ Too old date rejected: ${match[0]}`);
          continue;
        }
        
        let adjustedConfidence = pattern.confidence;
        
        // Reduce confidence for ambiguous dates (could be DD/MM or MM/DD)
        if (isAmbiguous && pattern.format.includes('US')) {
          adjustedConfidence *= 0.8;
          console.log(`⚠️ Ambiguous date format detected: ${match[0]}`);
        }
        
        // Boost confidence for dates in first few lines (more likely to be receipt date)
        const lineIndex = lines.findIndex(line => line.includes(match[0]));
        if (lineIndex >= 0 && lineIndex < 5) {
          adjustedConfidence *= 1.1;
        }
        
        // Boost confidence for recent dates (more likely to be recent receipts)
        if (daysDiff < 365) { // Within last year
          adjustedConfidence *= 1.05;
        }
        
        candidates.push({
          date: dateObj,
          confidence: Math.min(adjustedConfidence, 0.95), // Cap at 0.95
          format: pattern.format,
          rawMatch: match[0],
          isAmbiguous
        });
        
        console.log(`✅ Found date candidate: ${match[0]} -> ${dateObj.toISOString().split('T')[0]} (${pattern.format}, confidence: ${adjustedConfidence.toFixed(2)})`);
        
      } catch (error) {
        console.log(`❌ Error parsing date "${match[0]}": ${error.message}`);
      }
    }
  }

  // If we have ambiguous US format dates, try to resolve using context
  const ambiguousUS = candidates.filter(c => c.isAmbiguous && c.format.includes('US'));
  if (ambiguousUS.length > 0) {
    console.log('🔄 Attempting to resolve ambiguous US format dates...');
    
    // Look for vendor context clues
    const textUpper = text.toUpperCase();
    const isUSVendor = ['HOME DEPOT', 'WALMART', 'TARGET', 'LOWES', 'BEST BUY', 'CVS'].some(vendor => 
      textUpper.includes(vendor)
    );
    
    if (isUSVendor) {
      console.log('🇺🇸 US vendor detected, prioritizing MM/DD format');
      ambiguousUS.forEach(candidate => {
        candidate.confidence *= 1.2; // Boost MM/DD interpretation
      });
    }
  }

  // Sort candidates by confidence and select the best one
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    console.log('❌ No valid dates found');
    return { date: null, confidence: 0, format: 'none' };
  }

  const best = candidates[0];
  const isoDate = best.date.toISOString().split('T')[0];
  
  console.log(`🎯 Selected best date: ${best.rawMatch} -> ${isoDate} (${best.format}, confidence: ${best.confidence.toFixed(2)})`);
  
  // Log other candidates for debugging
  if (candidates.length > 1) {
    console.log('📋 Other date candidates:');
    candidates.slice(1, 3).forEach(candidate => {
      console.log(`   ${candidate.rawMatch} -> ${candidate.date.toISOString().split('T')[0]} (${candidate.format}, confidence: ${candidate.confidence.toFixed(2)})`);
    });
  }

  return {
    date: isoDate,
    confidence: best.confidence,
    format: best.format
  };
}

// Input validation functions
function validateImageUrl(url: string): RequestValidation {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Image URL is required and must be a string' };
  }
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { isValid: false, error: 'Image URL cannot be empty' };
  }
  
  // Check URL format
  try {
    const urlObj = new URL(trimmedUrl);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Image URL must use HTTP or HTTPS protocol' };
    }
    
    // Check for supported image types in URL
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
    const hasImageExtension = supportedExtensions.some(ext => 
      trimmedUrl.toLowerCase().includes(ext)
    );
    
    // Allow URLs without extensions (cloud storage URLs)
    if (!hasImageExtension && !trimmedUrl.includes('storage.googleapis.com') && 
        !trimmedUrl.includes('amazonaws.com') && !trimmedUrl.includes('cloudinary.com')) {
      return { 
        isValid: false, 
        error: 'Image URL must point to a supported image format (JPG, PNG, WebP, BMP, GIF) or cloud storage' 
      };
    }
    
    return { isValid: true, sanitizedImageUrl: trimmedUrl };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

function validateRequest(req: Request): { isValid: boolean; error?: string; data?: any } {
  // Check method
  if (req.method !== 'POST') {
    return { isValid: false, error: 'Only POST method is allowed' };
  }
  
  // Check content type
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return { isValid: false, error: 'Content-Type must be application/json' };
  }
  
  return { isValid: true };
}

function validateResponse(result: OCRResult): ValidationResult {
  const issues: string[] = [];
  let confidence = 1.0;
  
  // Check required fields
  if (!result.vendor || result.vendor.trim() === '') {
    issues.push('Vendor not detected');
    confidence -= 0.2;
  }
  
  if (!result.total || result.total <= 0) {
    issues.push('Total amount not detected or invalid');
    confidence -= 0.25;
  }
  
  if (!result.date || result.date === '') {
    issues.push('Date not detected');
    confidence -= 0.15;
  }
  
  // Check line items
  if (!result.lineItems || result.lineItems.length === 0) {
    issues.push('No line items extracted');
    confidence -= 0.2;
  } else {
    const invalidItems = result.lineItems.filter(item => 
      !item.description || item.description.trim() === '' || 
      !item.total_price || item.total_price <= 0
    );
    
    if (invalidItems.length > 0) {
      issues.push(`${invalidItems.length} invalid line items`);
      confidence -= (invalidItems.length / result.lineItems.length) * 0.1;
    }
  }
  
  // Check mathematical consistency
  if (result.subtotal && result.tax && result.total) {
    const calculatedTotal = result.subtotal + result.tax;
    const difference = Math.abs(calculatedTotal - result.total);
    if (difference > 0.01) {
      issues.push(`Math inconsistency: subtotal (${result.subtotal}) + tax (${result.tax}) ≠ total (${result.total})`);
      confidence -= 0.15;
    }
  }
  
  // Check confidence scores
  if (result.confidence?.overall && result.confidence.overall < 0.5) {
    issues.push('Low overall extraction confidence');
    confidence -= 0.1;
  }
  
  confidence = Math.max(confidence, 0);
  
  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (confidence >= 0.8) quality = 'excellent';
  else if (confidence >= 0.65) quality = 'good';
  else if (confidence >= 0.45) quality = 'fair';
  else quality = 'poor';
  
  return {
    isValid: issues.length === 0,
    issues,
    quality,
    confidence
  };
}

function createErrorResponse(error: string, code: string = 'PROCESSING_ERROR', status: number = 400, debugLogs?: DebugLog[], userFriendlyMessage?: string): Response {
  const response = {
    success: false,
    error: error,
    error_code: code,
    user_friendly_message: userFriendlyMessage || getUserFriendlyMessage(code),
    vendor: '',
    total: 0,
    document_type: 'unknown' as const,
    document_confidence: 0,
    confidence: {},
    debug_logs: debugLogs || [],
    timestamp: new Date().toISOString()
  };
  
  return new Response(
    JSON.stringify(response),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function processWithTestMode(isTestMode: boolean, testDocument?: string, debugLogs?: DebugLog[]): Promise<{ text: string; source: string }> {
  if (isTestMode && testDocument && SAMPLE_DOCUMENTS[testDocument as keyof typeof SAMPLE_DOCUMENTS]) {
    const sample = SAMPLE_DOCUMENTS[testDocument as keyof typeof SAMPLE_DOCUMENTS];
    logDebug(debugLogs || [], 'INFO', 'TEST_MODE', `Using sample document: ${testDocument}`, { expectedVendor: sample.expectedVendor, expectedTotal: sample.expectedTotal });
    return { text: sample.text, source: 'test_sample' };
  }
  return { text: '', source: 'vision_api' };
}

serve(async (req) => {
  const startTime = Date.now();
  const debugLogs: DebugLog[] = [];
  const metrics: ProcessingMetrics = { startTime };
  
  logDebug(debugLogs, 'INFO', 'REQUEST_START', 'OCR processing request received', { 
    method: req.method, 
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request format
    const requestValidation = validateRequest(req);
    if (!requestValidation.isValid) {
      logDebug(debugLogs, 'ERROR', 'REQUEST_VALIDATION', requestValidation.error || 'Invalid request', undefined, startTime);
      return createErrorResponse(
        requestValidation.error || 'Invalid request format',
        'INVALID_REQUEST',
        400,
        debugLogs
      );
    }

    // Parse and validate JSON body
    let requestData: any;
    try {
      requestData = await req.json();
    } catch (error) {
      logDebug(debugLogs, 'ERROR', 'JSON_PARSE', 'Failed to parse JSON body', { error: error.message }, startTime);
      return createErrorResponse(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400,
        debugLogs
      );
    }

    // Validate required fields
    const { imageUrl, testMode = false, testDocument = 'home_depot' } = requestData;
    
    const urlValidation = validateImageUrl(imageUrl);
    if (!urlValidation.isValid) {
      logDebug(debugLogs, 'ERROR', 'URL_VALIDATION', urlValidation.error || 'Invalid image URL', { imageUrl }, startTime);
      return createErrorResponse(
        urlValidation.error || 'Invalid image URL',
        'INVALID_URL',
        400,
        debugLogs
      );
    }

    const sanitizedImageUrl = urlValidation.sanitizedImageUrl!;
    
    logDebug(debugLogs, 'INFO', 'VALIDATION_PASSED', 'Request validation successful', {
      imageUrl: sanitizedImageUrl,
      testMode,
      testDocument: testMode ? testDocument : undefined
    }, startTime);

    // Check if we're in test mode
    let fullText: string;
    let textSource: string;
    
    if (testMode) {
      const testResult = await processWithTestMode(testMode, testDocument, debugLogs);
      fullText = testResult.text;
      textSource = testResult.source;
      
      if (!fullText) {
        logDebug(debugLogs, 'ERROR', 'TEST_MODE', 'Invalid test document specified', { testDocument }, startTime);
        return createErrorResponse(
          `Invalid test document: ${testDocument}. Available: ${Object.keys(SAMPLE_DOCUMENTS).join(', ')}`,
          'INVALID_TEST_DOCUMENT',
          400,
          debugLogs
        );
      }
    } else {
      // Production mode - call Google Vision API
      const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
      if (!apiKey) {
        logDebug(debugLogs, 'ERROR', 'CONFIG', 'Google Cloud Vision API key not configured', undefined, startTime);
        return createErrorResponse(
          'OCR service not configured',
          'SERVICE_UNAVAILABLE',
          503,
          debugLogs,
          'Our scanning service is temporarily unavailable. You can enter details manually.'
        );
      }

      logDebug(debugLogs, 'INFO', 'VISION_API_START', 'Calling Google Cloud Vision API', { imageUrl: sanitizedImageUrl }, startTime);
      const visionStartTime = Date.now();

      try {
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
                    imageUri: sanitizedImageUrl
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

        metrics.ocrTime = Date.now() - visionStartTime;
        logDebug(debugLogs, 'INFO', 'VISION_API_COMPLETE', 'Google Cloud Vision API call completed', {
          status: visionResponse.status,
          statusText: visionResponse.statusText,
          processingTime: metrics.ocrTime
        }, visionStartTime);

        if (!visionResponse.ok) {
          const errorText = await visionResponse.text();
          logDebug(debugLogs, 'ERROR', 'VISION_API_ERROR', 'Vision API returned error', {
            status: visionResponse.status,
            statusText: visionResponse.statusText,
            error: errorText
          }, visionStartTime);
          
          return createErrorResponse(
            `OCR service error: ${visionResponse.status} ${visionResponse.statusText}`,
            'OCR_SERVICE_ERROR',
            502,
            debugLogs
          );
        }

        const visionData = await visionResponse.json();
        const textAnnotations = visionData.responses?.[0]?.textAnnotations;
        
        if (!textAnnotations || textAnnotations.length === 0) {
          logDebug(debugLogs, 'WARN', 'NO_TEXT_DETECTED', 'No text detected in image', { visionData }, startTime);
          return createErrorResponse(
            'No text detected in the provided image. Please ensure the image is clear and contains readable text.',
            'NO_TEXT_DETECTED',
            400,
            debugLogs
          );
        }

        if (visionData.responses?.[0]?.error) {
          const visionError = visionData.responses[0].error;
          logDebug(debugLogs, 'ERROR', 'VISION_API_RESPONSE_ERROR', 'Vision API response contains error', visionError, startTime);
          return createErrorResponse(
            `Image processing error: ${visionError.message || 'Unknown error'}`,
            'IMAGE_PROCESSING_ERROR',
            400,
            debugLogs
          );
        }

        fullText = textAnnotations[0].description || '';
        textSource = 'vision_api';
        
        logDebug(debugLogs, 'INFO', 'TEXT_EXTRACTED', 'Text successfully extracted from image', {
          textLength: fullText.length,
          lineCount: fullText.split('\n').length,
          source: textSource
        }, visionStartTime);

      } catch (fetchError) {
        logDebug(debugLogs, 'ERROR', 'NETWORK_ERROR', 'Network error calling Vision API', {
          error: fetchError.message,
          name: fetchError.name
        }, visionStartTime);
        
        return createErrorResponse(
          'Failed to connect to OCR service. Please try again later.',
          'NETWORK_ERROR',
          503,
          debugLogs
        );
      }
    }

    // Validate extracted text
    if (!fullText || fullText.trim().length < 10) {
      logDebug(debugLogs, 'WARN', 'INSUFFICIENT_TEXT', 'Extracted text is too short', {
        textLength: fullText?.length || 0,
        text: fullText?.substring(0, 100)
      }, startTime);
      
      return createErrorResponse(
        'Insufficient text detected. Please provide a clearer image with more readable content.',
        'INSUFFICIENT_TEXT',
        400,
        debugLogs
      );
    }

    // Start parsing phase
    const parseStartTime = Date.now();
    logDebug(debugLogs, 'INFO', 'PARSING_START', 'Starting text parsing and extraction', {
      textLength: fullText.length,
      lineCount: fullText.split('\n').length
    }, parseStartTime);

    // Detect document type first
    const documentDetection = detectDocumentType(fullText);
    logDebug(debugLogs, 'INFO', 'DOCUMENT_TYPE_DETECTED', 'Document type detection completed', documentDetection, parseStartTime);

    // Parse receipt data from OCR text
    const result = parseReceiptText(fullText);
    
    // Add document type information to result
    result.document_type = documentDetection.type;
    result.document_confidence = documentDetection.confidence;
    
    metrics.parsingTime = Date.now() - parseStartTime;
    metrics.totalTime = Date.now() - startTime;
    
    logDebug(debugLogs, 'INFO', 'PARSING_COMPLETE', 'Text parsing completed', {
      vendor: result.vendor,
      total: result.total,
      date: result.date,
      lineItemsCount: result.lineItems?.length || 0,
      processingTime: metrics.parsingTime
    }, parseStartTime);

    // Validate the extraction results
    const validation = validateResponse(result);
    logDebug(debugLogs, 'INFO', 'VALIDATION_COMPLETE', 'Response validation completed', validation, startTime);

    // Add metadata to response
    const response = {
      ...result,
      success: true,
      extraction_metadata: {
        text_source: textSource,
        processing_time_ms: metrics.totalTime,
        ocr_time_ms: metrics.ocrTime,
        parsing_time_ms: metrics.parsingTime,
        text_length: fullText.length,
        line_count: fullText.split('\n').length,
        validation: validation,
        timestamp: new Date().toISOString()
      },
      debug_logs: debugLogs
    };
    
    logDebug(debugLogs, 'INFO', 'REQUEST_COMPLETE', 'OCR processing completed successfully', {
      totalTime: metrics.totalTime,
      extractionQuality: result.extraction_quality,
      overallConfidence: result.confidence?.overall
    }, startTime);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logDebug(debugLogs, 'ERROR', 'UNHANDLED_ERROR', 'Unhandled error in OCR processing', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: Date.now() - startTime
    }, startTime);
    
    return createErrorResponse(
      'An unexpected error occurred during processing. Please try again.',
      'INTERNAL_ERROR',
      500,
      debugLogs
    );
  }
});

function parseReceiptText(text: string): OCRResult {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // DEBUG - Log first 10 lines to see what we're working with
  console.log('First 10 lines:', lines.slice(0, 10));
  
  const result: OCRResult = {
    vendor: '',
    total: 0,
    date: '',
    confidence: {}
  };

  // Initialize confidence details
  result.confidence_details = {};

  // VENDOR - Use new vendor normalization
  console.log('🔍 Searching for vendor using normalization...');
  const vendorMatch = findVendor(text);
  
  if (vendorMatch.vendor) {
    result.vendor = vendorMatch.vendor;
    result.vendor_raw = vendorMatch.vendor_raw;
    result.confidence!.vendor = vendorMatch.confidence;
    result.confidence_details.vendor = {
      score: vendorMatch.confidence,
      method: vendorMatch.method,
      source: vendorMatch.source,
      position: vendorMatch.position,
      validated: false
    };
    console.log(`✅ Found vendor: ${vendorMatch.vendor} (raw: "${vendorMatch.vendor_raw}") with confidence ${vendorMatch.confidence}`);
  } else {
    console.log('❌ No vendor detected');
    result.vendor = '';
    result.vendor_raw = '';
    result.confidence!.vendor = 0;
    result.confidence_details.vendor = {
      score: 0,
      method: 'fallback',
      validated: false
    };
  }

  // SUBTOTAL - Extract subtotal first
  const subtotalRegex = /SUBTOTAL[\s:]*\$?([,\d]+\.?\d{0,2})/i;
  const subtotalMatch = text.match(subtotalRegex);
  if (subtotalMatch) {
    result.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
    console.log(`✅ Found SUBTOTAL: ${result.subtotal}`);
  }

  // TAX - Extract tax amount
  const taxRegex = /(?:SALES\s)?TAX[\s:]*\$?([,\d]+\.?\d{0,2})/i;
  const taxMatch = text.match(taxRegex);
  if (taxMatch) {
    result.tax = parseFloat(taxMatch[1].replace(/,/g, ''));
    console.log(`✅ Found TAX: ${result.tax}`);
  }

  // TOTAL - Look for the word TOTAL followed by amount (prioritize this)
  console.log('🔍 Searching for TOTAL amount...');
  
  // Try word-boundary TOTAL pattern first (prevents matching SUBTOTAL)
  const totalRegex = /\bTOTAL\b[\s:]*\$?([,\d]+\.?\d{0,2})/i;
  const totalMatch = text.match(totalRegex);
  
  if (totalMatch) {
    result.total = parseFloat(totalMatch[1].replace(/,/g, ''));
    result.confidence!.total = 0.9;
    console.log(`✅ Found TOTAL: ${result.total} (from pattern: ${totalMatch[0]})`);
  } else {
    // Try negative lookbehind to explicitly exclude SUBTOTAL
    const negativeLookbehindRegex = /(?<!SUB)TOTAL\b[\s:]*\$?([,\d]+\.?\d{0,2})/i;
    const negativeLookbehindMatch = text.match(negativeLookbehindRegex);
    
    if (negativeLookbehindMatch) {
      result.total = parseFloat(negativeLookbehindMatch[1].replace(/,/g, ''));
      result.confidence!.total = 0.9;
      console.log(`✅ Found TOTAL (negative lookbehind): ${result.total} (from pattern: ${negativeLookbehindMatch[0]})`);
    } else {
      // Fallback: Look for multi-line TOTAL pattern (TOTAL\n$791.17)
      const multilineTotalRegex = /\bTOTAL\b\s*\n\s*\$?([,\d]+\.?\d{0,2})/i;
      const multilineMatch = text.match(multilineTotalRegex);
      
      if (multilineMatch) {
        result.total = parseFloat(multilineMatch[1].replace(/,/g, ''));
        result.confidence!.total = 0.8;
        console.log(`✅ Found multi-line TOTAL: ${result.total} (from pattern: ${multilineMatch[0]})`);
      } else if (result.subtotal && result.tax) {
        // Calculate total from subtotal + tax if available
        result.total = result.subtotal + result.tax;
        result.confidence!.total = 0.7;
        console.log(`✅ Calculated TOTAL from subtotal + tax: ${result.total}`);
      } else {
        // Last resort: Find largest dollar amount (but be more selective)
        console.log('⚠️ No TOTAL found, looking for largest amount...');
        const amountRegex = /\$?([,\d]+\.\d{2})/g;
        const amounts = [...text.matchAll(amountRegex)]
          .map(m => {
            const amount = parseFloat(m[1].replace(/,/g, ''));
            console.log(`Found amount: ${amount} from "${m[0]}"`);
            return amount;
          })
          .filter(a => a > 0 && a < 10000)
          .sort((a, b) => b - a);
        
        if (amounts.length > 0) {
          result.total = amounts[0]; // Largest amount
          result.confidence!.total = 0.5; // Lower confidence
          console.log(`⚠️ Using largest amount as fallback: ${result.total}`);
        }
      }
    }
  }

  // EXTRACT LINE ITEMS - ENHANCED WITH MULTI-LINE GROUPING
  console.log('🔍 Extracting line items with enhanced parsing...');
  const lineItems: LineItem[] = [];

  // Helper function to analyze receipt structure and identify price columns
  function analyzeReceiptStructure(lines: string[]) {
    const priceColumnPositions: number[] = [];
    let rightAlignedPrices = 0;
    
    for (const line of lines) {
      const priceMatch = line.match(/\$?(\d+\.\d{2})$/);
      if (priceMatch) {
        const position = line.lastIndexOf(priceMatch[0]);
        priceColumnPositions.push(position);
        rightAlignedPrices++;
      }
    }
    
    const avgPricePosition = priceColumnPositions.length > 0 
      ? priceColumnPositions.reduce((sum, pos) => sum + pos, 0) / priceColumnPositions.length 
      : -1;
    
    return {
      hasStructuredLayout: rightAlignedPrices > 2,
      avgPricePosition,
      totalLines: lines.length
    };
  }

  // Helper function to detect if a line is likely a continuation of an item description
  function isDescriptionContinuation(currentLine: string, previousLine: string, structure: any): boolean {
    // If current line has no price but previous line didn't either, likely continuation
    const currentHasPrice = /\$?\d+\.\d{2}/.test(currentLine);
    const previousHasPrice = /\$?\d+\.\d{2}/.test(previousLine);
    
    if (currentHasPrice) return false; // Lines with prices are typically complete items
    
    // Check for indentation pattern (continuation lines often have leading whitespace)
    const currentIndent = currentLine.length - currentLine.trimLeft().length;
    const isIndented = currentIndent > 0;
    
    // Check if line is too short to be a complete item
    const isTooShort = currentLine.trim().length < 15;
    
    // Check if previous line ended abruptly (no price, reasonable length)
    const previousTrimmed = previousLine.trim();
    const previousEndedAbruptly = !previousHasPrice && previousTrimmed.length > 5 && previousTrimmed.length < 50;
    
    return (isIndented || isTooShort) && previousEndedAbruptly;
  }

  // Helper function to extract quantity from various patterns
  function extractQuantity(text: string): { quantity: number; cleanText: string } {
    const patterns = [
      { regex: /^(\d+)x\s+(.+)/i, multiplier: true },           // "3x ITEM NAME"
      { regex: /^(\d+)\s*@\s*(.+)/i, multiplier: true },        // "2 @ ITEM NAME"
      { regex: /^qty:?\s*(\d+)\s+(.+)/i, multiplier: true },    // "QTY: 5 ITEM NAME"
      { regex: /^(\d+\.\d+)\s*lbs?\s+(.+)/i, multiplier: true }, // "2.5 lbs ITEM NAME"
      { regex: /^(\d+)\s+(.+)/i, multiplier: false },           // "3 ITEM NAME" (less confident)
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const qty = parseFloat(match[1]);
        if (qty > 0 && qty <= 999) { // Reasonable quantity range
          return {
            quantity: qty,
            cleanText: match[2].trim()
          };
        }
      }
    }
    
    return { quantity: 1, cleanText: text };
  }

  // Helper function to extract prices and detect price structure
  function extractPrices(line: string): { totalPrice?: number; unitPrice?: number; confidence: number } {
    // Enhanced price patterns for different receipt formats
    const pricePatterns = [
      // Two prices: total and unit price (e.g., "123.45  12.99")
      { regex: /(\d+\.\d{2})\s+(\d+\.\d{2})$/, totalIndex: 1, unitIndex: 2, confidence: 0.9 },
      // Single price at end
      { regex: /\$?(\d+\.\d{2})$/, totalIndex: 1, unitIndex: null, confidence: 0.8 },
      // Price with currency symbol
      { regex: /\$(\d+\.\d{2})\s*$/, totalIndex: 1, unitIndex: null, confidence: 0.85 },
      // Multiple prices in line (take the rightmost as total)
      { regex: /.*\$?(\d+\.\d{2})\s*$/, totalIndex: 1, unitIndex: null, confidence: 0.7 }
    ];
    
    for (const pattern of pricePatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const totalPrice = parseFloat(match[pattern.totalIndex]);
        const unitPrice = pattern.unitIndex ? parseFloat(match[pattern.unitIndex]) : undefined;
        
        // Validate prices are reasonable
        if (totalPrice > 0 && totalPrice < 10000) {
          return {
            totalPrice,
            unitPrice: unitPrice && unitPrice > 0 && unitPrice < 1000 ? unitPrice : undefined,
            confidence: pattern.confidence
          };
        }
      }
    }
    
    return { confidence: 0 };
  }

  // Analyze receipt structure first
  const structure = analyzeReceiptStructure(lines);
  console.log(`📊 Receipt structure: ${structure.hasStructuredLayout ? 'structured' : 'unstructured'}, avg price position: ${structure.avgPricePosition}`);

  // Group related lines and extract items
  const processedLines: Array<{ combined: string; confidence: number; lineNumbers: number[] }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip non-item lines
    if (!line || line.length < 5) continue;
    if (line.match(/HOME|DEPOT|MARKET|DRIVE|CASHIER|SUBTOTAL|TAX|TOTAL|CARD|GIFT|BALANCE|RETURN|POLICY|DAYS|EXPIRES|\*{3,}|PHONE|ADDRESS|THANK YOU/i)) continue;
    
    let combinedLine = line;
    let confidence = 0.8;
    const lineNumbers = [i];
    
    // Check if next line(s) might be continuation of current item
    let j = i + 1;
    while (j < lines.length && j - i <= 3) { // Limit to 3 continuation lines max
      const nextLine = lines[j].trim();
      if (!nextLine) break;
      
      if (isDescriptionContinuation(nextLine, combinedLine, structure)) {
        combinedLine += ' ' + nextLine;
        lineNumbers.push(j);
        confidence *= 0.9; // Slightly lower confidence for multi-line items
        j++;
      } else {
        break;
      }
    }
    
    processedLines.push({ combined: combinedLine, confidence, lineNumbers });
    i = j - 1; // Skip the lines we've already processed
  }

  console.log(`📋 Processed ${processedLines.length} potential items from ${lines.length} lines`);

  // Extract items from processed lines
  for (const processedLine of processedLines) {
    const { combined, confidence: groupConfidence, lineNumbers } = processedLine;
    
    const prices = extractPrices(combined);
    if (prices.totalPrice) {
      // Extract description (everything before the price)
      const priceText = combined.match(/\$?\d+\.\d{2}.*$/)?.[0] || '';
      const beforePrice = combined.substring(0, combined.lastIndexOf(priceText)).trim();
      
      // Extract quantity and clean description
      const { quantity, cleanText } = extractQuantity(beforePrice);
      
      // Clean the description further
      let description = cleanText
        .replace(/^\d{10,14}\s*/, '') // Remove UPC/EAN (10-14 digits)
        .replace(/^\d{4,6}\s+\d{4,6}\s*/, '') // Remove SKU patterns
        .replace(/<[A-Z]>\s*$/, '') // Remove <A> type markers
        .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
        .replace(/[^\w\s\-\.\/&%#]+/g, ' ') // Remove excessive special characters
        .trim();
      
      // Skip if no meaningful description
      if (!description || description.length < 2) {
        console.log(`⏭️ Skipping item with insufficient description: "${combined}"`);
        continue;
      }
      
      // Calculate unit price if not provided
      let finalUnitPrice = prices.unitPrice;
      if (!finalUnitPrice && quantity > 1) {
        finalUnitPrice = prices.totalPrice / quantity;
      }
      
      // Create line item with confidence scoring
      const item: LineItem = {
        description,
        total_price: prices.totalPrice
      };
      
      if (quantity > 1) {
        item.quantity = quantity;
      }
      
      if (finalUnitPrice && finalUnitPrice !== prices.totalPrice) {
        item.unit_price = Math.round(finalUnitPrice * 100) / 100; // Round to 2 decimal places
      }
      
      lineItems.push(item);
      
      const qtyText = quantity > 1 ? `${quantity}x ` : '';
      const unitText = finalUnitPrice && finalUnitPrice !== prices.totalPrice ? ` @ $${finalUnitPrice}` : '';
      console.log(`✅ Found item: ${qtyText}${description}${unitText} = $${prices.totalPrice} (confidence: ${(groupConfidence * prices.confidence).toFixed(2)}, lines: ${lineNumbers.join(',')})`);
    }
  }

  // ALWAYS set lineItems, even if empty
  result.lineItems = lineItems;
  
  // Enhanced confidence scoring based on extraction success
  let lineItemsConfidence = 0.0;
  if (lineItems.length > 0) {
    const hasQuantities = lineItems.filter(item => item.quantity && item.quantity > 1).length;
    const hasUnitPrices = lineItems.filter(item => item.unit_price).length;
    const avgDescriptionLength = lineItems.reduce((sum, item) => sum + item.description.length, 0) / lineItems.length;
    
    lineItemsConfidence = 0.5; // Base confidence
    if (structure.hasStructuredLayout) lineItemsConfidence += 0.1;
    if (hasQuantities > 0) lineItemsConfidence += 0.1;
    if (hasUnitPrices > 0) lineItemsConfidence += 0.1;
    if (avgDescriptionLength > 10) lineItemsConfidence += 0.1;
    if (lineItems.length >= 3) lineItemsConfidence += 0.1;
    
    lineItemsConfidence = Math.min(lineItemsConfidence, 0.9); // Cap at 0.9
  }
  
  result.confidence!.lineItems = lineItemsConfidence;

  console.log(`✅ Total items extracted: ${lineItems.length}`);
  if (lineItems.length === 0) {
    console.warn('⚠️ No line items found - check regex patterns');
  }

  // Extract date with comprehensive confidence details
  const parsedDate = parseReceiptDate(text);
  if (parsedDate.date) {
    result.date = parsedDate.date;
    result.confidence!.date = parsedDate.confidence;
    result.confidence_details.date = {
      score: parsedDate.confidence,
      method: 'pattern_match' as ExtractionMethod,
      source: parsedDate.format,
      validated: true
    };
    console.log(`📅 Found date: ${result.date} (confidence: ${parsedDate.confidence}, format: ${parsedDate.format})`);
  } else {
    result.date = new Date().toISOString().split('T')[0];
    result.confidence!.date = 0.3;
    result.confidence_details.date = {
      score: 0.3,
      method: 'fallback' as ExtractionMethod,
      source: 'current_date',
      validated: false
    };
    console.log('📅 No valid date found, using current date');
  }

  // Add total confidence details based on extraction method
  let totalMethod: ExtractionMethod = 'pattern_match';
  let totalValidated = false;
  
  if (result.total && result.subtotal && result.tax) {
    const calculated = result.subtotal + result.tax;
    totalValidated = Math.abs(calculated - result.total) <= 0.01;
    
    if (!totalValidated) {
      console.warn(`⚠️ Total mismatch! Extracted: ${result.total}, Calculated: ${calculated}`);
      result.total = calculated; // Use calculated value
      totalMethod = 'calculated';
      totalValidated = true;
      result.confidence!.total = calculateBaseConfidence('calculated', true);
    }
  }
  
  result.confidence_details.total = {
    score: result.confidence!.total || 0,
    method: totalMethod,
    source: totalValidated ? 'validated_calculation' : 'pattern_match',
    validated: totalValidated
  };

  // Add line items confidence details
  result.confidence_details.lineItems = {
    score: result.confidence!.lineItems || 0,
    method: 'pattern_match' as ExtractionMethod,
    source: `${lineItems.length}_items_extracted`,
    validated: structure.hasStructuredLayout
  };

  // Calculate overall confidence using enhanced system
  const overallConfidence = calculateOverallConfidence({
    vendor: result.confidence!.vendor,
    total: result.confidence!.total,
    date: result.confidence!.date,
    lineItems: result.confidence!.lineItems,
    document_confidence: result.document_confidence
  });
  
  result.confidence!.overall = overallConfidence;
  result.extraction_quality = getExtractionQuality(overallConfidence);
  result.validation_passed = totalValidated && (result.confidence!.vendor || 0) > 0.5;

  console.log(`🎯 Overall extraction confidence: ${overallConfidence.toFixed(3)} (${result.extraction_quality})`);
  console.log(`📊 Confidence breakdown:`, {
    vendor: result.confidence!.vendor,
    total: result.confidence!.total,
    date: result.confidence!.date,
    lineItems: result.confidence!.lineItems,
    overall: overallConfidence
  });

  return result;
}

function detectDocumentType(text: string): { type: 'receipt' | 'invoice' | 'statement' | 'unknown', confidence: number, reasoning: string } {
  const textUpper = text.toUpperCase();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Initialize scores
  let receiptScore = 0;
  let invoiceScore = 0;
  let statementScore = 0;
  
  const reasoning: string[] = [];
  
  // Receipt detection patterns
  const receiptKeywords = ['RECEIPT', 'SUBTOTAL', 'SALES TAX', 'TAX', 'TOTAL', 'CHANGE', 'THANK YOU'];
  const receiptVendors = ['HOME DEPOT', 'WALMART', 'TARGET', 'LOWES', 'MENARDS', 'HARBOR FREIGHT', 'COSTCO'];
  const receiptStructure = [/SUBTOTAL[\s:]*\$?[\d,]+\.?\d{0,2}/i, /TAX[\s:]*\$?[\d,]+\.?\d{0,2}/i, /TOTAL[\s:]*\$?[\d,]+\.?\d{0,2}/i];
  
  // Invoice detection patterns
  const invoiceKeywords = ['INVOICE', 'INVOICE #', 'INVOICE NUMBER', 'NET', 'TERMS', 'DUE DATE', 'PAYMENT DUE', 'REMIT TO'];
  const invoiceNumbers = [/INVOICE\s*#?\s*[A-Z0-9-]+/i, /INV[-#]?\s*[A-Z0-9]+/i];
  const invoiceTerms = ['NET 30', 'NET 15', 'DUE UPON RECEIPT', 'PAYMENT TERMS', 'DUE DATE'];
  
  // Statement detection patterns
  const statementKeywords = ['STATEMENT', 'ACCOUNT', 'BALANCE', 'PREVIOUS BALANCE', 'CURRENT BALANCE', 'STATEMENT DATE'];
  const statementStructure = ['ACCOUNT NUMBER', 'STATEMENT PERIOD', 'PREVIOUS BALANCE', 'PAYMENTS', 'CHARGES'];
  
  // Check receipt indicators
  for (const keyword of receiptKeywords) {
    if (textUpper.includes(keyword)) {
      receiptScore += 0.1;
      reasoning.push(`Receipt keyword: ${keyword}`);
    }
  }
  
  for (const vendor of receiptVendors) {
    if (textUpper.includes(vendor)) {
      receiptScore += 0.15;
      reasoning.push(`Receipt vendor: ${vendor}`);
    }
  }
  
  for (const pattern of receiptStructure) {
    if (pattern.test(text)) {
      receiptScore += 0.15;
      reasoning.push(`Receipt structure: ${pattern.source}`);
    }
  }
  
  // Check for item list structure (strong receipt indicator)
  const itemLines = lines.filter(line => /\$[\d,]+\.\d{2}$/.test(line));
  if (itemLines.length >= 2) {
    receiptScore += 0.2;
    reasoning.push(`Item list structure: ${itemLines.length} items found`);
  }
  
  // Check invoice indicators
  for (const keyword of invoiceKeywords) {
    if (textUpper.includes(keyword)) {
      invoiceScore += 0.15;
      reasoning.push(`Invoice keyword: ${keyword}`);
    }
  }
  
  for (const pattern of invoiceNumbers) {
    if (pattern.test(text)) {
      invoiceScore += 0.2;
      reasoning.push(`Invoice number pattern: ${pattern.source}`);
    }
  }
  
  for (const term of invoiceTerms) {
    if (textUpper.includes(term)) {
      invoiceScore += 0.15;
      reasoning.push(`Invoice term: ${term}`);
    }
  }
  
  // Check statement indicators
  for (const keyword of statementKeywords) {
    if (textUpper.includes(keyword)) {
      statementScore += 0.15;
      reasoning.push(`Statement keyword: ${keyword}`);
    }
  }
  
  for (const structure of statementStructure) {
    if (textUpper.includes(structure)) {
      statementScore += 0.1;
      reasoning.push(`Statement structure: ${structure}`);
    }
  }
  
  // Normalize scores to 0-1 range
  receiptScore = Math.min(receiptScore, 1.0);
  invoiceScore = Math.min(invoiceScore, 1.0);
  statementScore = Math.min(statementScore, 1.0);
  
  console.log(`📊 Document type scores: Receipt=${receiptScore.toFixed(2)}, Invoice=${invoiceScore.toFixed(2)}, Statement=${statementScore.toFixed(2)}`);
  
  // Determine document type
  const maxScore = Math.max(receiptScore, invoiceScore, statementScore);
  
  if (maxScore < 0.3) {
    console.log('🤷 Document type uncertain - defaulting to unknown');
    return {
      type: 'unknown',
      confidence: maxScore,
      reasoning: `Low confidence detection. ${reasoning.join('; ')}`
    };
  }
  
  let detectedType: 'receipt' | 'invoice' | 'statement' | 'unknown';
  if (receiptScore === maxScore) {
    detectedType = 'receipt';
    console.log(`📄 Detected as RECEIPT with confidence ${receiptScore.toFixed(2)}`);
  } else if (invoiceScore === maxScore) {
    detectedType = 'invoice';
    console.log(`📋 Detected as INVOICE with confidence ${invoiceScore.toFixed(2)}`);
  } else {
    detectedType = 'statement';
    console.log(`📊 Detected as STATEMENT with confidence ${statementScore.toFixed(2)}`);
  }
  
  return {
    type: detectedType,
    confidence: maxScore,
    reasoning: reasoning.join('; ')
  };
}