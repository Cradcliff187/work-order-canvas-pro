// Spatial extraction engine using Vision API structured data

import { 
  VisionApiResponse, 
  Word, 
  Block, 
  BoundingPoly,
  getAllWords, 
  getTopBlocks, 
  calculateFontSize, 
  isSameHorizontalLine, 
  getRightmostX, 
  calculateDistance 
} from './vision-api-spatial.ts';

export interface SpatialExtractionResult {
  merchant: string;
  merchant_confidence: number;
  total: number;
  total_confidence: number;
  date: string;
  date_confidence: number;
  lineItems: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice: number;
    confidence: number;
  }>;
  lineItems_confidence: number;
  overall_confidence: number;
  extraction_method: 'spatial_analysis';
  spatial_validation: {
    merchant_location: 'top_section';
    total_location: 'bottom_right';
    mathematical_consistency: boolean;
  };
}

// Main spatial extraction function
export function runSpatialExtraction(visionResponse: VisionApiResponse): SpatialExtractionResult {
  console.log('🎯 Starting spatial extraction with Vision API structured data...');
  
  const words = getAllWords(visionResponse, 0.7); // Higher confidence threshold
  
  // Extract each field using spatial analysis
  const merchantResult = extractMerchantSpatial(visionResponse);
  const totalResult = extractTotalSpatial(words);
  const dateResult = extractDateSpatial(words);
  const lineItemsResult = extractLineItemsSpatial(visionResponse);
  
  // Calculate overall confidence
  const overallConfidence = (
    merchantResult.confidence * 0.25 +
    totalResult.confidence * 0.35 +
    dateResult.confidence * 0.15 +
    lineItemsResult.confidence * 0.25
  );
  
  // Validate spatial consistency
  const spatialValidation = validateSpatialConsistency(lineItemsResult.items, totalResult.amount);
  
  return {
    merchant: merchantResult.merchant,
    merchant_confidence: merchantResult.confidence,
    total: totalResult.amount,
    total_confidence: totalResult.confidence,
    date: dateResult.date,
    date_confidence: dateResult.confidence,
    lineItems: lineItemsResult.items,
    lineItems_confidence: lineItemsResult.confidence,
    overall_confidence: overallConfidence,
    extraction_method: 'spatial_analysis',
    spatial_validation: {
      merchant_location: 'top_section',
      total_location: 'bottom_right',
      mathematical_consistency: spatialValidation
    }
  };
}

// Extract merchant name from largest font block in top section
function extractMerchantSpatial(visionResponse: VisionApiResponse): { merchant: string; confidence: number } {
  const topBlocks = getTopBlocks(visionResponse, 0.2); // Top 20%
  
  if (topBlocks.length === 0) {
    return { merchant: '', confidence: 0 };
  }
  
  // Find block with largest average font size
  let largestBlock: Block | null = null;
  let largestFontSize = 0;
  
  for (const block of topBlocks) {
    const fontSize = calculateFontSize(block.boundingBox);
    if (fontSize > largestFontSize) {
      largestFontSize = fontSize;
      largestBlock = block;
    }
  }
  
  if (!largestBlock) {
    return { merchant: '', confidence: 0 };
  }
  
  // Clean merchant name (remove address/phone)
  const merchantText = cleanMerchantName(largestBlock.text);
  const confidence = largestBlock.confidence * 0.9; // Slight penalty for text cleaning
  
  return { merchant: merchantText, confidence };
}

// Extract total amount using keyword + spatial proximity
function extractTotalSpatial(words: Word[]): { amount: number; confidence: number } {
  const totalKeywords = ['TOTAL', 'GRAND TOTAL', 'AMOUNT DUE', 'BALANCE', 'CHARGE'];
  const amountPattern = /\$?(\d+\.\d{2})/;
  
  // Find total keyword
  let totalKeywordWord: Word | null = null;
  
  for (const word of words) {
    const upperText = word.text.toUpperCase();
    if (totalKeywords.some(keyword => upperText.includes(keyword))) {
      totalKeywordWord = word;
      break;
    }
  }
  
  if (!totalKeywordWord) {
    // Fallback: find largest amount (spatial fallback)
    return findLargestAmountSpatial(words);
  }
  
  // Find number on same horizontal line, furthest to the right
  let bestMatch: { word: Word; amount: number; distance: number } | null = null;
  
  for (const word of words) {
    const amountMatch = word.text.match(amountPattern);
    if (amountMatch && isSameHorizontalLine(totalKeywordWord.boundingBox, word.boundingBox)) {
      const amount = parseFloat(amountMatch[1]);
      const distance = calculateDistance(totalKeywordWord.boundingBox, word.boundingBox);
      
      if (!bestMatch || getRightmostX(word.boundingBox) > getRightmostX(bestMatch.word.boundingBox)) {
        bestMatch = { word, amount, distance };
      }
    }
  }
  
  if (bestMatch) {
    // High confidence for keyword + spatial match
    const confidence = Math.min(totalKeywordWord.confidence * bestMatch.word.confidence * 1.2, 0.95);
    return { amount: bestMatch.amount, confidence };
  }
  
  // Fallback to largest amount with lower confidence
  const fallback = findLargestAmountSpatial(words);
  return { amount: fallback.amount, confidence: fallback.confidence * 0.6 };
}

// Fallback: find largest amount using spatial context
function findLargestAmountSpatial(words: Word[]): { amount: number; confidence: number } {
  const amountPattern = /\$?(\d+\.\d{2})/;
  let largestAmount = 0;
  let bestWord: Word | null = null;
  
  for (const word of words) {
    const amountMatch = word.text.match(amountPattern);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      if (amount > largestAmount) {
        largestAmount = amount;
        bestWord = word;
      }
    }
  }
  
  return {
    amount: largestAmount,
    confidence: bestWord ? bestWord.confidence * 0.7 : 0 // Lower confidence for heuristic
  };
}

// Extract date with spatial validation
function extractDateSpatial(words: Word[]): { date: string; confidence: number } {
  const datePatterns = [
    /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/,
    /(?i)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4}/,
    /\d{1,2}[/-]\d{1,2}[/-]\d{2}/
  ];
  
  const dateKeywords = ['DATE', 'ISSUED', 'PURCHASE'];
  const excludeKeywords = ['RETURN', 'EXPIRE', 'VALID'];
  
  // Look for dates near date keywords first
  for (const word of words) {
    const upperText = word.text.toUpperCase();
    if (dateKeywords.some(keyword => upperText.includes(keyword))) {
      // Search nearby words for date
      const nearbyDate = findDateNearKeyword(word, words, datePatterns);
      if (nearbyDate) {
        return { date: normalizeDate(nearbyDate.text), confidence: nearbyDate.confidence * 0.9 };
      }
    }
  }
  
  // Fallback: find any date not near exclude keywords
  for (const word of words) {
    for (const pattern of datePatterns) {
      if (pattern.test(word.text)) {
        // Check if near exclude keywords
        const nearExclude = words.some(w => {
          const upperText = w.text.toUpperCase();
          return excludeKeywords.some(keyword => upperText.includes(keyword)) &&
                 calculateDistance(word.boundingBox, w.boundingBox) < 100;
        });
        
        if (!nearExclude) {
          return { date: normalizeDate(word.text), confidence: word.confidence * 0.7 };
        }
      }
    }
  }
  
  return { date: new Date().toISOString().split('T')[0], confidence: 0 };
}

// Extract line items using spatial table construction
function extractLineItemsSpatial(visionResponse: VisionApiResponse): { items: any[]; confidence: number } {
  // This is a simplified version - full implementation would construct spatial lines
  // and identify item patterns using y-coordinate grouping
  
  const items: any[] = [];
  const words = getAllWords(visionResponse, 0.6);
  
  // Group words by y-coordinate to form lines
  const lines = groupWordsByLine(words);
  
  // Identify item section (after header, before totals)
  const itemLines = identifyItemSection(lines);
  
  // Parse each line for item pattern
  for (const line of itemLines) {
    const item = parseLineForItem(line);
    if (item) {
      items.push(item);
    }
  }
  
  const confidence = items.length > 0 ? 0.8 : 0;
  return { items: items.slice(0, 20), confidence }; // Limit to top 20 items
}

// Helper functions

function cleanMerchantName(text: string): string {
  // Remove common address/phone patterns
  return text
    .split('\n')[0] // Take first line
    .replace(/\d{10,}/, '') // Remove phone numbers
    .replace(/\d+\s+\w+\s+(st|ave|blvd|rd|street|avenue|boulevard|road)/i, '') // Remove addresses
    .trim();
}

function findDateNearKeyword(keywordWord: Word, words: Word[], patterns: RegExp[]): Word | null {
  const maxDistance = 150; // pixels
  
  for (const word of words) {
    if (calculateDistance(keywordWord.boundingBox, word.boundingBox) <= maxDistance) {
      for (const pattern of patterns) {
        if (pattern.test(word.text)) {
          return word;
        }
      }
    }
  }
  
  return null;
}

function normalizeDate(dateText: string): string {
  // Convert various date formats to YYYY-MM-DD
  try {
    const date = new Date(dateText);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function groupWordsByLine(words: Word[]): Word[][] {
  const lines: Word[][] = [];
  const tolerance = 10;
  
  for (const word of words) {
    let addedToLine = false;
    
    for (const line of lines) {
      if (line.length > 0 && isSameHorizontalLine(word.boundingBox, line[0].boundingBox, tolerance)) {
        line.push(word);
        addedToLine = true;
        break;
      }
    }
    
    if (!addedToLine) {
      lines.push([word]);
    }
  }
  
  // Sort words in each line by x-coordinate
  lines.forEach(line => line.sort((a, b) => 
    Math.min(...a.boundingBox.vertices.map(v => v.x)) - 
    Math.min(...b.boundingBox.vertices.map(v => v.x))
  ));
  
  return lines;
}

function identifyItemSection(lines: Word[][]): Word[][] {
  // Simplified: return middle section of document
  const startIndex = Math.floor(lines.length * 0.2);
  const endIndex = Math.floor(lines.length * 0.8);
  return lines.slice(startIndex, endIndex);
}

function parseLineForItem(line: Word[]): any | null {
  const lineText = line.map(w => w.text).join(' ');
  const pricePattern = /\$?(\d+\.\d{2})/g;
  const prices = [...lineText.matchAll(pricePattern)].map(m => parseFloat(m[1]));
  
  if (prices.length > 0 && lineText.length > 5) {
    return {
      description: lineText.replace(/\$?\d+\.\d{2}/g, '').trim(),
      totalPrice: Math.max(...prices),
      confidence: Math.min(...line.map(w => w.confidence))
    };
  }
  
  return null;
}

function validateSpatialConsistency(lineItems: any[], total: number): boolean {
  if (lineItems.length === 0) return false;
  
  const itemsSum = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const tolerance = Math.max(total * 0.1, 5); // 10% tolerance or $5
  
  return Math.abs(itemsSum - total) <= tolerance;
}