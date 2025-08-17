// Advanced OCR text processing and cleaning utilities

export interface TextProcessingOptions {
  aggressive: boolean;
  preserveFormatting: boolean;
  fixCommonOCRErrors: boolean;
  normalizeSpacing: boolean;
}

export interface ProcessedText {
  original: string;
  cleaned: string;
  lines: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    type: 'character' | 'spacing' | 'format' | 'word';
    confidence: number;
  }>;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// Common OCR character substitution errors
const OCR_CHAR_FIXES: Record<string, string> = {
  // Numbers and letters
  'O': '0', '0': 'O',  // Context-dependent, will be handled intelligently
  'l': '1', 'I': '1', '1': 'l',
  'S': '5', '5': 'S',
  'G': '6', '6': 'G',
  'B': '8', '8': 'B',
  'g': '9', '9': 'g',
  'Z': '2', '2': 'Z',
  
  // Special characters
  'rn': 'm', 'ni': 'm', 'ii': 'll',
  'vv': 'w', 'VV': 'W',
  
  // Common word fixes
  'TOTAI': 'TOTAL',
  'TOTRL': 'TOTAL',
  'TOIAL': 'TOTAL',
  'SUBTOTAI': 'SUBTOTAL',
  'SAIES': 'SALES',
  'SEIES': 'SALES',
  'SEALES': 'SALES',
  'TAK': 'TAX',
  'TAKS': 'TAX',
  'TAXX': 'TAX',
  'PAYHENT': 'PAYMENT',
  'METHOO': 'METHOD',
  'HETHOC': 'METHOD'
};

// Patterns for different types of text elements
const MONETARY_PATTERN = /\$?\d{1,6}(?:[,.]?\d{2,3})*(?:\.\d{2})?/g;
const DATE_PATTERN = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g;
const TIME_PATTERN = /\d{1,2}:\d{2}(?:\s*[AP]M)?/gi;
const PHONE_PATTERN = /\(?\d{3}\)?\s*\d{3}[\-\s]?\d{4}/g;
const ZIP_PATTERN = /\b\d{5}(?:\-\d{4})?\b/g;

export function processOCRText(text: string, options: TextProcessingOptions = {
  aggressive: true,
  preserveFormatting: false,
  fixCommonOCRErrors: true,
  normalizeSpacing: true
}): ProcessedText {
  console.log('🔧 Processing OCR text with advanced cleaning...');
  
  const corrections: ProcessedText['corrections'] = [];
  let processed = text;
  
  // Step 1: Fix common OCR character errors
  if (options.fixCommonOCRErrors) {
    processed = fixCharacterErrors(processed, corrections);
  }
  
  // Step 2: Fix spacing issues
  if (options.normalizeSpacing) {
    processed = fixSpacingIssues(processed, corrections);
  }
  
  // Step 3: Context-aware number/letter fixes
  processed = fixContextualErrors(processed, corrections);
  
  // Step 4: Fix word-level errors
  processed = fixWordErrors(processed, corrections);
  
  // Step 5: Normalize formatting
  if (!options.preserveFormatting) {
    processed = normalizeFormatting(processed, corrections);
  }
  
  // Step 6: Clean up excessive whitespace
  processed = cleanWhitespace(processed);
  
  const lines = processed.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const quality = assessTextQuality(processed, corrections);
  
  console.log(`🔧 Text processing complete: ${corrections.length} corrections made, quality: ${quality}`);
  
  return {
    original: text,
    cleaned: processed,
    lines,
    corrections,
    quality
  };
}

function fixCharacterErrors(text: string, corrections: ProcessedText['corrections']): string {
  let result = text;
  
  // Fix obvious character substitutions
  for (const [wrong, right] of Object.entries(OCR_CHAR_FIXES)) {
    if (wrong.length === 1 && right.length === 1) {
      // Skip context-dependent fixes for now
      continue;
    }
    
    const regex = new RegExp(wrong, 'g');
    if (regex.test(result)) {
      result = result.replace(regex, right);
      corrections.push({
        original: wrong,
        corrected: right,
        type: 'character',
        confidence: 0.8
      });
    }
  }
  
  return result;
}

function fixSpacingIssues(text: string, corrections: ProcessedText['corrections']): string {
  let result = text;
  
  // Fix spaced-out words (common OCR issue)
  const spacedWords = [
    { pattern: /T\s*O\s*T\s*A\s*L/gi, replacement: 'TOTAL' },
    { pattern: /S\s*U\s*B\s*T\s*O\s*T\s*A\s*L/gi, replacement: 'SUBTOTAL' },
    { pattern: /S\s*A\s*L\s*E\s*S/gi, replacement: 'SALES' },
    { pattern: /T\s*A\s*X/gi, replacement: 'TAX' },
    { pattern: /P\s*A\s*Y\s*M\s*E\s*N\s*T/gi, replacement: 'PAYMENT' },
    { pattern: /M\s*E\s*T\s*H\s*O\s*D/gi, replacement: 'METHOD' },
    { pattern: /C\s*A\s*S\s*H\s*I\s*E\s*R/gi, replacement: 'CASHIER' },
    { pattern: /R\s*E\s*C\s*E\s*I\s*P\s*T/gi, replacement: 'RECEIPT' }
  ];
  
  for (const { pattern, replacement } of spacedWords) {
    const matches = result.match(pattern);
    if (matches) {
      result = result.replace(pattern, replacement);
      corrections.push({
        original: matches[0],
        corrected: replacement,
        type: 'spacing',
        confidence: 0.9
      });
    }
  }
  
  // Fix currency spacing: "$ 12.34" -> "$12.34"
  result = result.replace(/\$\s+(\d)/g, '$$$1');
  
  // Fix percentage spacing: "5 %" -> "5%"
  result = result.replace(/(\d)\s+%/g, '$1%');
  
  return result;
}

function fixContextualErrors(text: string, corrections: ProcessedText['corrections']): string {
  let result = text;
  
  // Fix O/0 in monetary amounts - dollars should use 0
  result = result.replace(/\$(\d*)[O](\d*)/g, (match, before, after) => {
    const corrected = `$${before}0${after}`;
    corrections.push({
      original: match,
      corrected,
      type: 'character',
      confidence: 0.95
    });
    return corrected;
  });
  
  // Fix O/0 in prices and totals
  result = result.replace(/(\d+)[O](\d{2})\b/g, (match, before, after) => {
    const corrected = `${before}0${after}`;
    corrections.push({
      original: match,
      corrected,
      type: 'character',
      confidence: 0.9
    });
    return corrected;
  });
  
  // Fix 1/l/I in words (should be letters)
  const wordPatterns = [
    { pattern: /\bTOTA1\b/g, replacement: 'TOTAL' },
    { pattern: /\bSUBTOTA1\b/g, replacement: 'SUBTOTAL' },
    { pattern: /\bTO1AL\b/g, replacement: 'TOTAL' },
    { pattern: /\b1TAL\b/g, replacement: 'ITAL' },
    { pattern: /\bSA1ES\b/g, replacement: 'SALES' },
    { pattern: /\bCASH1ER\b/g, replacement: 'CASHIER' }
  ];
  
  for (const { pattern, replacement } of wordPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      corrections.push({
        original: pattern.source,
        corrected: replacement,
        type: 'character',
        confidence: 0.85
      });
    }
  }
  
  return result;
}

function fixWordErrors(text: string, corrections: ProcessedText['corrections']): string {
  let result = text;
  
  // Common word corrections from OCR_CHAR_FIXES
  for (const [wrong, right] of Object.entries(OCR_CHAR_FIXES)) {
    if (wrong.length > 1) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, right);
        corrections.push({
          original: wrong,
          corrected: right,
          type: 'word',
          confidence: 0.9
        });
      }
    }
  }
  
  return result;
}

function normalizeFormatting(text: string, corrections: ProcessedText['corrections']): string {
  let result = text;
  
  // Normalize currency formatting
  result = result.replace(/USD\s*\$(\d+\.?\d*)/gi, '$$$1');
  result = result.replace(/\$\s*USD\s*(\d+\.?\d*)/gi, '$$$1');
  
  // Normalize date formats to consistent format
  result = result.replace(/(\d{1,2})\-(\d{1,2})\-(\d{2,4})/g, '$1/$2/$3');
  result = result.replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$1/$2/$3');
  
  // Normalize time formats
  result = result.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, '$1:$2 $3');
  
  return result;
}

function cleanWhitespace(text: string): string {
  return text
    .replace(/\t/g, ' ')           // Convert tabs to spaces
    .replace(/\r\n/g, '\n')        // Normalize line endings
    .replace(/\r/g, '\n')          // Convert CR to LF
    .replace(/ +/g, ' ')           // Collapse multiple spaces
    .replace(/\n +/g, '\n')        // Remove leading spaces on lines
    .replace(/ +\n/g, '\n')        // Remove trailing spaces on lines
    .replace(/\n{3,}/g, '\n\n')    // Collapse excessive blank lines
    .trim();
}

function assessTextQuality(text: string, corrections: ProcessedText['corrections']): ProcessedText['quality'] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const totalChars = text.length;
  const correctionRatio = corrections.length / Math.max(totalChars / 100, 1);
  
  // Count potential quality indicators
  let qualityScore = 0.5;  // Start at fair
  
  // Good indicators
  const monetaryMatches = text.match(MONETARY_PATTERN) || [];
  const dateMatches = text.match(DATE_PATTERN) || [];
  const hasStructure = lines.some(line => /total|subtotal|tax/i.test(line));
  
  if (monetaryMatches.length > 0) qualityScore += 0.1;
  if (dateMatches.length > 0) qualityScore += 0.1;
  if (hasStructure) qualityScore += 0.2;
  if (correctionRatio < 0.05) qualityScore += 0.2;  // Few corrections needed
  
  // Bad indicators
  const gibberish = text.match(/[^a-zA-Z0-9\s\$\.\-\/\(\)\,\:\#]/g) || [];
  const gibberishRatio = gibberish.length / totalChars;
  
  if (gibberishRatio > 0.1) qualityScore -= 0.3;
  if (correctionRatio > 0.2) qualityScore -= 0.2;
  if (lines.length < 3) qualityScore -= 0.1;
  
  qualityScore = Math.max(0, Math.min(1, qualityScore));
  
  if (qualityScore >= 0.8) return 'excellent';
  if (qualityScore >= 0.6) return 'good';
  if (qualityScore >= 0.4) return 'fair';
  return 'poor';
}

// Extract structured data elements from text
export function extractStructuredElements(text: string): {
  monetary: string[];
  dates: string[];
  times: string[];
  phones: string[];
  addresses: string[];
} {
  return {
    monetary: text.match(MONETARY_PATTERN) || [],
    dates: text.match(DATE_PATTERN) || [],
    times: text.match(TIME_PATTERN) || [],
    phones: text.match(PHONE_PATTERN) || [],
    addresses: extractAddresses(text)
  };
}

function extractAddresses(text: string): string[] {
  const addresses: string[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1].trim();
    
    // Look for street address + city/state/zip pattern
    if (/\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)/i.test(line)) {
      if (/[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}/i.test(nextLine)) {
        addresses.push(`${line} ${nextLine}`);
      }
    }
  }
  
  return addresses;
}