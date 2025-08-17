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

// Dynamic tolerance calculation based on document dimensions
function calculateDynamicTolerance(visionResponse: VisionApiResponse): number {
  const page = visionResponse.pages[0];
  if (!page) return 10;
  
  // Base tolerance on document size - larger documents need more tolerance
  const avgDimension = (page.width + page.height) / 2;
  const baseTolerance = Math.max(8, Math.min(20, avgDimension / 100));
  
  console.log(`📏 Dynamic tolerance: ${baseTolerance}px for ${page.width}x${page.height} document`);
  return baseTolerance;
}

// Extract total amount using enhanced spatial analysis with distance weighting
function extractTotalSpatial(words: Word[]): { amount: number; confidence: number } {
  const totalKeywords = ['TOTAL', 'GRAND TOTAL', 'AMOUNT DUE', 'BALANCE DUE', 'CHARGE', 'SUBTOTAL'];
  const amountPattern = /\$?(\d+\.\d{2})/;
  
  console.log(`🎯 Searching for total among ${words.length} words...`);
  
  // Enhanced keyword search with priority weighting
  const keywordPriority = {
    'TOTAL': 1.0,
    'GRAND TOTAL': 1.0,
    'AMOUNT DUE': 0.9,
    'BALANCE DUE': 0.9,
    'CHARGE': 0.7,
    'SUBTOTAL': 0.6
  };
  
  let bestMatch: { amount: number; confidence: number } | null = null;
  
  for (const keyword of totalKeywords) {
    const priority = keywordPriority[keyword as keyof typeof keywordPriority] || 0.5;
    const keywordWords = words.filter(w => 
      w.text.toUpperCase().includes(keyword) && w.confidence > 0.5
    );
    
    for (const keywordWord of keywordWords) {
      // Enhanced spatial search with multiple strategies
      const candidates = words.filter(w => {
        const amountMatch = w.text.match(amountPattern);
        if (!amountMatch || w.confidence < 0.5) return false;
        
        // Strategy 1: Same horizontal line to the right
        const isRightOfKeyword = getRightmostX(keywordWord.boundingBox) < getRightmostX(w.boundingBox);
        const isSameLine = isSameHorizontalLine(w.boundingBox, keywordWord.boundingBox, 20);
        
        // Strategy 2: Below keyword within reasonable distance
        const isBelow = Math.min(...w.boundingBox.vertices.map(v => v.y)) > 
                       Math.max(...keywordWord.boundingBox.vertices.map(v => v.y));
        const distance = calculateDistance(keywordWord.boundingBox, w.boundingBox);
        const isNearby = distance < 150;
        
        return (isRightOfKeyword && isSameLine) || (isBelow && isNearby);
      }).map(w => {
        const distance = calculateDistance(keywordWord.boundingBox, w.boundingBox);
        const distanceScore = Math.max(0, 1 - (distance / 300)); // Adjusted for better sensitivity
        const amount = parseFloat(w.text.match(amountPattern)![1]);
        const visionConfidence = w.confidence || 0.5;
        
        // Combined confidence score
        const combinedConfidence = (visionConfidence * distanceScore * priority);
        
        return { word: w, distance, distanceScore, amount, combinedConfidence };
      }).sort((a, b) => b.combinedConfidence - a.combinedConfidence);
      
      if (candidates.length > 0) {
        const best = candidates[0];
        console.log(`💰 Found total candidate: $${best.amount} near "${keyword}" (confidence: ${best.combinedConfidence.toFixed(3)})`);
        
        if (!bestMatch || best.combinedConfidence > bestMatch.confidence) {
          bestMatch = {
            amount: best.amount,
            confidence: Math.min(best.combinedConfidence * 1.2, 0.95)
          };
        }
      }
    }
  }
  
  if (bestMatch) {
    console.log(`✅ Best total match: $${bestMatch.amount} (confidence: ${bestMatch.confidence.toFixed(3)})`);
    return bestMatch;
  }
  
  // Enhanced fallback with better heuristics
  return findLargestAmountSpatial(words);
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
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4}/i,
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

// Enhanced mathematical validation with auto-correction
function validateSpatialConsistency(lineItems: any[], total: number): boolean {
  if (lineItems.length === 0) return total > 0;
  
  const itemsSum = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const tolerance = Math.max(total * 0.15, 3); // 15% tolerance or $3
  
  const isConsistent = Math.abs(itemsSum - total) <= tolerance;
  
  if (!isConsistent) {
    console.log(`⚠️ Mathematical inconsistency: Items sum $${itemsSum.toFixed(2)}, Total $${total.toFixed(2)} (diff: $${Math.abs(itemsSum - total).toFixed(2)})`);
  } else {
    console.log(`✅ Mathematical consistency: Items sum $${itemsSum.toFixed(2)} ≈ Total $${total.toFixed(2)}`);
  }
  
  return isConsistent;
}

// Auto-correct common OCR mathematical errors
export function autoCorrectMathematicalErrors(lineItems: any[], total: number): { 
  correctedTotal?: number; 
  correctedItems?: any[]; 
  corrections: string[] 
} {
  const corrections: string[] = [];
  let correctedTotal = total;
  let correctedItems = [...lineItems];
  
  if (lineItems.length === 0) return { corrections };
  
  const itemsSum = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const difference = Math.abs(itemsSum - total);
  
  // Only auto-correct if difference is small and likely an OCR error
  if (difference > 0.01 && difference < Math.max(total * 0.05, 2)) {
    
    // Strategy 1: Adjust total to match items (more reliable)
    if (itemsSum > 0 && lineItems.length >= 2) {
      correctedTotal = itemsSum;
      corrections.push(`Adjusted total from $${total.toFixed(2)} to $${itemsSum.toFixed(2)} to match line items`);
    }
    
    // Strategy 2: Check for common OCR digit errors in total
    else {
      const potentialTotals = generateOCRVariations(total);
      for (const potentialTotal of potentialTotals) {
        if (Math.abs(itemsSum - potentialTotal) < 0.50) {
          correctedTotal = potentialTotal;
          corrections.push(`Corrected total OCR error: $${total.toFixed(2)} → $${potentialTotal.toFixed(2)}`);
          break;
        }
      }
    }
  }
  
  return { correctedTotal, correctedItems, corrections };
}

// Generate common OCR digit error variations
function generateOCRVariations(amount: number): number[] {
  const variations: number[] = [];
  const amountStr = amount.toFixed(2);
  const [dollars, cents] = amountStr.split('.');
  
  // Common OCR digit confusions
  const ocrConfusions: { [key: string]: string[] } = {
    '0': ['8', '6'],
    '1': ['7', 'l'],
    '2': ['7', 'z'],
    '3': ['8', '5'],
    '4': ['9', '1'],
    '5': ['6', '8', '3'],
    '6': ['8', '0', '5'],
    '7': ['1', '2'],
    '8': ['0', '6', '3'],
    '9': ['4', '8']
  };
  
  // Try variations in the dollars part
  for (let i = 0; i < dollars.length; i++) {
    const digit = dollars[i];
    const alternatives = ocrConfusions[digit] || [];
    
    for (const alt of alternatives) {
      const newDollars = dollars.substring(0, i) + alt + dollars.substring(i + 1);
      const newAmount = parseFloat(`${newDollars}.${cents}`);
      if (!isNaN(newAmount) && newAmount > 0) {
        variations.push(newAmount);
      }
    }
  }
  
  return variations;
}