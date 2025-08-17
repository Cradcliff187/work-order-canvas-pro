// Advanced line item extraction with table structure detection

import { 
  VisionApiResponse, 
  Word, 
  Block, 
  getAllWords, 
  isSameHorizontalLine,
  getLeftmostX,
  getRightmostX,
  calculateDistance 
} from "./vision-api-spatial.ts";

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  confidence: number;
  position: { x: number; y: number };
  rawText: string;
}

export interface TableColumn {
  type: 'description' | 'quantity' | 'unit_price' | 'total_price';
  xRange: { min: number; max: number };
  confidence: number;
}

export interface LineItemExtractionResult {
  items: LineItem[];
  tableStructure: TableColumn[];
  confidence: number;
  method: string;
  totalItemsSum?: number;
  spatialValidation: boolean;
}

// Detect table structure by analyzing column positions
export function detectTableStructure(words: Word[]): TableColumn[] {
  console.log('📊 Detecting table structure...');
  
  // Group words by approximate horizontal position
  const xPositions: { [key: number]: Word[] } = {};
  
  words.forEach(word => {
    const x = Math.round(getLeftmostX(word.boundingBox) / 20) * 20; // Round to nearest 20px
    if (!xPositions[x]) xPositions[x] = [];
    xPositions[x].push(word);
  });
  
  // Identify columns based on content patterns
  const columns: TableColumn[] = [];
  
  for (const [xPos, wordsAtPosition] of Object.entries(xPositions)) {
    const x = parseInt(xPos);
    const sampleWords = wordsAtPosition.slice(0, 10); // Sample for analysis
    
    // Analyze content to determine column type
    const numberCount = sampleWords.filter(w => /\d+\.\d{2}/.test(w.text)).length;
    const quantityCount = sampleWords.filter(w => /^\d+$/.test(w.text)).length;
    const textCount = sampleWords.filter(w => /[a-zA-Z]/.test(w.text) && w.text.length > 2).length;
    
    let columnType: TableColumn['type'];
    let confidence = 0;
    
    if (textCount > numberCount && textCount > quantityCount) {
      columnType = 'description';
      confidence = textCount / sampleWords.length;
    } else if (numberCount > 0 && x > 300) { // Prices usually on the right
      columnType = 'total_price';
      confidence = numberCount / sampleWords.length;
    } else if (quantityCount > 0 && x < 200) { // Quantities usually on the left
      columnType = 'quantity';
      confidence = quantityCount / sampleWords.length;
    } else {
      columnType = 'unit_price';
      confidence = 0.3;
    }
    
    if (confidence > 0.3) {
      columns.push({
        type: columnType,
        xRange: { 
          min: x - 20, 
          max: x + 100 
        },
        confidence
      });
    }
  }
  
  console.log(`📋 Detected ${columns.length} table columns:`, columns.map(c => c.type));
  return columns;
}

// Group words into logical lines based on y-coordinate clustering
export function groupWordsIntoLines(words: Word[], tolerance: number = 10): Word[][] {
  const lines: Word[][] = [];
  const sortedWords = [...words].sort((a, b) => {
    const aY = Math.min(...a.boundingBox.vertices.map(v => v.y));
    const bY = Math.min(...b.boundingBox.vertices.map(v => v.y));
    return aY - bY;
  });
  
  for (const word of sortedWords) {
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
  
  // Sort words within each line by x-coordinate
  lines.forEach(line => {
    line.sort((a, b) => getLeftmostX(a.boundingBox) - getLeftmostX(b.boundingBox));
  });
  
  return lines;
}

// Extract line items using advanced table structure detection
export function extractLineItemsAdvanced(visionResponse: VisionApiResponse): LineItemExtractionResult {
  console.log('🛍️ Starting advanced line item extraction...');
  
  const words = getAllWords(visionResponse, 0.4);
  const tableStructure = detectTableStructure(words);
  const wordLines = groupWordsIntoLines(words, 12);
  
  // Filter lines that likely contain items (exclude headers, totals, etc.)
  const itemLines = wordLines.filter(line => {
    if (line.length < 2) return false;
    
    const lineText = line.map(w => w.text).join(' ').toUpperCase();
    
    // Exclude header lines
    if (lineText.includes('DESCRIPTION') || lineText.includes('ITEM') || 
        lineText.includes('QTY') || lineText.includes('PRICE')) {
      return false;
    }
    
    // Exclude total lines
    if (lineText.includes('TOTAL') || lineText.includes('SUBTOTAL') || 
        lineText.includes('TAX') || lineText.includes('AMOUNT DUE')) {
      return false;
    }
    
    // Must have at least one price-like number
    const hasPricePattern = line.some(w => /\d+\.\d{2}/.test(w.text));
    
    return hasPricePattern;
  });
  
  console.log(`📝 Found ${itemLines.length} potential item lines`);
  
  // Parse each line into line items
  const items: LineItem[] = [];
  
  for (const line of itemLines) {
    const item = parseLineIntoItem(line, tableStructure);
    if (item) {
      items.push(item);
    }
  }
  
  // Calculate spatial validation
  const totalItemsSum = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const spatialValidation = validateItemSpatialLayout(items);
  
  // Calculate overall confidence
  const avgConfidence = items.length > 0 
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length 
    : 0;
  
  console.log(`✅ Extracted ${items.length} line items (confidence: ${avgConfidence.toFixed(2)})`);
  
  return {
    items,
    tableStructure,
    confidence: avgConfidence,
    method: 'advanced_spatial_table_detection',
    totalItemsSum,
    spatialValidation
  };
}

// Parse a line of words into a line item
function parseLineIntoItem(line: Word[], tableStructure: TableColumn[]): LineItem | null {
  if (line.length === 0) return null;
  
  // Extract price (rightmost number with decimal)
  const priceWords = line.filter(w => /\d+\.\d{2}/.test(w.text));
  if (priceWords.length === 0) return null;
  
  const priceWord = priceWords[priceWords.length - 1]; // Rightmost price
  const totalPrice = parseFloat(priceWord.text.replace(/[^0-9.]/g, ''));
  
  // Extract description (leftmost text words)
  const descriptionWords = line.filter(w => {
    const isPrice = /\d+\.\d{2}/.test(w.text);
    const isQuantity = /^\d+$/.test(w.text) && parseInt(w.text) < 100;
    return !isPrice && !isQuantity && w.text.length > 1;
  });
  
  const description = descriptionWords.map(w => w.text).join(' ').trim();
  if (!description) return null;
  
  // Extract quantity if present
  const quantityWords = line.filter(w => /^\d+$/.test(w.text) && parseInt(w.text) < 100);
  const quantity = quantityWords.length > 0 ? parseInt(quantityWords[0].text) : undefined;
  
  // Calculate confidence based on structure clarity
  let confidence = Math.min(...line.map(w => w.confidence));
  
  // Boost confidence for well-structured items
  if (description.length > 3 && totalPrice > 0) confidence *= 1.2;
  if (quantity) confidence *= 1.1;
  
  confidence = Math.min(confidence, 0.95);
  
  return {
    description,
    quantity,
    totalPrice,
    confidence,
    position: {
      x: getLeftmostX(line[0].boundingBox),
      y: Math.min(...line[0].boundingBox.vertices.map(v => v.y))
    },
    rawText: line.map(w => w.text).join(' ')
  };
}

// Validate spatial layout consistency of extracted items
function validateItemSpatialLayout(items: LineItem[]): boolean {
  if (items.length < 2) return true;
  
  // Check if prices are generally aligned (similar x-coordinates)
  const priceXPositions = items.map(item => item.position.x);
  const avgPriceX = priceXPositions.reduce((sum, x) => sum + x, 0) / priceXPositions.length;
  const maxDeviation = Math.max(...priceXPositions.map(x => Math.abs(x - avgPriceX)));
  
  // Allow 50px deviation for price alignment
  const pricesAligned = maxDeviation < 50;
  
  // Check if items are in logical vertical order
  const yPositions = items.map(item => item.position.y);
  const isVerticallyOrdered = yPositions.every((y, i) => i === 0 || y > yPositions[i - 1] - 10);
  
  return pricesAligned && isVerticallyOrdered;
}