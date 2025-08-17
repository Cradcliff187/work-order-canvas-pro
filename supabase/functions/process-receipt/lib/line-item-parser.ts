// Line item extraction and parsing utilities

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  confidence: number;
}

interface ItemPrices {
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  raw_text?: string;
}

interface LineItemCandidate {
  description: string;
  prices: ItemPrices;
  confidence: number;
  line_index: number;
  raw_line: string;
}

// Enhanced line filtering - skip non-item lines
export function shouldSkipLine(line: string, index: number, totalLines: number): boolean {
  const trimmed = line.trim().toLowerCase();
  
  // Skip empty or very short lines
  if (trimmed.length < 3) return true;
  
  // Skip header/footer patterns
  const skipPatterns = [
    // Store information
    /^(?:welcome|thank you|thanks|visit|store|location|address|phone|email|website)/,
    /^(?:cashier|clerk|associate|manager|terminal|register)/,
    
    // Transaction metadata
    /^(?:date|time|receipt|invoice|order|transaction|ref|reference)/,
    /^(?:card|cash|change|tender|payment|method)/,
    /^(?:total|subtotal|tax|discount|savings|balance)/,
    
    // Common receipt footer
    /^(?:return|exchange|policy|warranty|guarantee)/,
    /^(?:survey|feedback|rate|review|www\.|http)/,
    /^(?:member|points|rewards|savings|earned)/,
    
    // Purely numeric lines (likely codes or totals)
    /^\d+[\.\,\s]*\d*$/,
    /^[\$€£¥]\d+[\.\,]\d{2}$/,
    
    // Lines with only special characters
    /^[\*\-\=\#\+\~\|\.]{3,}$/,
    
    // Barcodes and codes
    /^[A-Z0-9]{8,}$/,
    /^\*\d+\*$/,
    
    // Common non-item phrases
    /^(?:no|yes|approved|declined|authorized)/,
    /^(?:open|close|void|cancel|refund)/
  ];
  
  return skipPatterns.some(pattern => pattern.test(trimmed));
}

// Enhanced description cleaning with better pattern recognition
function cleanDescription(text: string): string {
  let cleaned = text
    // Remove prices and monetary amounts (enhanced patterns)
    .replace(/[\$€£¥]\d+(?:[,\.]\d{2})?/g, '')
    .replace(/\d+(?:[,\.]\d{2})?\s*[\$€£¥]/g, '')
    // Remove quantities with enhanced patterns
    .replace(/^\d+\s*[xX×]\s*/i, '')
    .replace(/^\d+\s*@\s*/i, '')
    .replace(/\s*[xX×]\s*\d+$/i, '')
    .replace(/\s*@\s*\d+$/i, '')
    // Remove common receipt codes and barcodes
    .replace(/\b[A-Z0-9]{6,}\b/g, '')
    .replace(/\*\d+\*/g, '')
    .replace(/\b\d{8,}\b/g, '')
    // Remove UPC/SKU patterns
    .replace(/\bUPC\s*:?\s*\d+/gi, '')
    .replace(/\bSKU\s*:?\s*\w+/gi, '')
    // Remove department codes
    .replace(/\bDEPT\s*:?\s*\d+/gi, '')
    // Clean up whitespace and special chars
    .replace(/[*#@^&%~`|\\{}[\]]+/g, ' ')
    .replace(/[-_=+]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove leading/trailing non-alphanumeric except for common item prefixes
  cleaned = cleaned.replace(/^[^\w\(\)\.]+|[^\w\(\)\.]+$/g, '');
  
  // Remove standalone numbers or single characters
  if (/^\d+$/.test(cleaned) || cleaned.length <= 1) {
    return '';
  }
  
  return cleaned;
}

// Enhanced price extraction with multiple currency support
function extractPrices(text: string): ItemPrices {
  const prices: ItemPrices = { raw_text: text };
  
  // Enhanced price patterns with currency support
  const pricePatterns = [
    // Quantity × Unit Price patterns
    { regex: /(\d+)\s*[xX×]\s*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/g, type: 'qty_unit' },
    { regex: /(\d+)\s*@\s*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/g, type: 'qty_unit' },
    { regex: /(\d+)\s*each\s*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/gi, type: 'qty_unit' },
    
    // Quantity + Total patterns
    { regex: /^(\d+)\s+[\$€£¥](\d+(?:[,\.]\d{2})?)/g, type: 'qty_total' },
    { regex: /(\d+)\s*pc\s*[\$€£¥](\d+(?:[,\.]\d{2})?)/gi, type: 'qty_total' },
    
    // Total price patterns (prioritize end of line)
    { regex: /[\$€£¥](\d+(?:[,\.]\d{2})?)$/g, type: 'total_end' },
    { regex: /(\d+(?:[,\.]\d{2})?)\s*[\$€£¥]$/g, type: 'total_end' },
    { regex: /total[\s:]*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/gi, type: 'total' },
    
    // Mid-line price patterns
    { regex: /[\$€£¥](\d+(?:[,\.]\d{2})?)/g, type: 'price_generic' },
    { regex: /(\d+(?:[,\.]\d{2})?)\s*[\$€£¥]/g, type: 'price_generic' },
    
    // Unit price indicators
    { regex: /@[\s]*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/g, type: 'unit' },
    { regex: /each[\s]*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/gi, type: 'unit' },
    { regex: /per[\s]*[\$€£¥]?(\d+(?:[,\.]\d{2})?)/gi, type: 'unit' },
    
    // Standalone quantity patterns
    { regex: /^(\d+)\s*[xX×]/g, type: 'qty_only' },
    { regex: /(\d+)\s*(?:pcs?|pieces?|items?)\b/gi, type: 'qty_only' }
  ];
  
  let bestTotal = null;
  let bestUnit = null;
  let totalConfidence = 0;
  let unitConfidence = 0;
  
  for (const pattern of pricePatterns) {
    const matches = [...text.matchAll(pattern.regex)];
    
    for (const match of matches) {
      const value = parseFloat(match[1].replace(',', '.'));
      
      if (isNaN(value) || value <= 0) continue;
      
      switch (pattern.type) {
        case 'qty_unit':
          prices.quantity = parseInt(match[1]);
          prices.unit_price = value;
          if (prices.quantity > 0) {
            prices.total_price = prices.quantity * value;
          }
          break;
          
        case 'qty_total':
          prices.quantity = parseInt(match[1]);
          prices.total_price = parseFloat(match[2].replace(',', '.'));
          if (prices.quantity > 1 && prices.total_price > 0) {
            prices.unit_price = prices.total_price / prices.quantity;
          }
          break;
          
        case 'total_end':
          if (totalConfidence < 0.9) {
            bestTotal = value;
            totalConfidence = 0.9;
          }
          break;
          
        case 'total':
          if (totalConfidence < 0.7) {
            bestTotal = value;
            totalConfidence = 0.7;
          }
          break;
          
        case 'unit':
          if (unitConfidence < 0.8) {
            bestUnit = value;
            unitConfidence = 0.8;
          }
          break;
          
        case 'price_generic':
          if (!bestTotal && totalConfidence < 0.5) {
            bestTotal = value;
            totalConfidence = 0.5;
          }
          break;
          
        case 'qty_only':
          if (!prices.quantity) {
            prices.quantity = parseInt(match[1]);
          }
          break;
      }
    }
  }
  
  // Apply best candidates if not already set
  if (!prices.total_price && bestTotal) {
    prices.total_price = bestTotal;
  }
  
  if (!prices.unit_price && bestUnit) {
    prices.unit_price = bestUnit;
  }
  
  // Infer missing values with validation
  if (prices.quantity && prices.unit_price && !prices.total_price) {
    prices.total_price = prices.quantity * prices.unit_price;
  } else if (prices.quantity && prices.total_price && !prices.unit_price && prices.quantity > 0) {
    prices.unit_price = prices.total_price / prices.quantity;
  }
  
  return prices;
}

function calculateLineItemConfidence(description: string, prices: ItemPrices): number {
  let confidence = 0.4; // Base confidence
  
  // Boost for good description
  if (description && description.length >= 3) {
    confidence += 0.2;
    if (description.length >= 10) confidence += 0.1;
    if (/^[A-Za-z]/.test(description)) confidence += 0.1; // Starts with letter
    if (description.length >= 20) confidence += 0.05; // Detailed description
  }
  
  // Boost for having price
  if (prices.total_price && prices.total_price > 0) {
    confidence += 0.25;
    if (prices.total_price > 1) confidence += 0.05; // Not just a cent
  }
  
  // Boost for having quantity
  if (prices.quantity && prices.quantity > 0) {
    confidence += 0.15;
    if (prices.quantity > 1) confidence += 0.05; // Multiple items
  }
  
  // Boost for having unit price that matches total
  if (prices.unit_price && prices.quantity && prices.total_price) {
    const calculatedTotal = prices.quantity * prices.unit_price;
    if (Math.abs(calculatedTotal - prices.total_price) <= 0.02) {
      confidence += 0.2; // Math consistency bonus
    }
  }
  
  // Penalty for very generic descriptions
  if (description && /^item\s/i.test(description)) {
    confidence *= 0.8;
  }
  
  return Math.min(confidence, 0.95);
}

export function extractLineItems(text: string): LineItem[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const candidates: LineItemCandidate[] = [];
  
  // Phase 1: Extract all potential line item candidates
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip obvious non-item lines
    if (shouldSkipLine(line, i, lines.length)) {
      continue;
    }
    
    // Extract prices and description
    const prices = extractPrices(line);
    const description = cleanDescription(line);
    
    // Must have a meaningful description
    if (description.length < 2) continue;
    
    // Calculate base confidence
    const confidence = calculateLineItemConfidence(description, prices);
    
    // Only include if confidence is reasonable
    if (confidence >= 0.25) {
      candidates.push({
        description,
        prices,
        confidence,
        line_index: i,
        raw_line: line
      });
    }
  }
  
  // Phase 2: Post-processing validation and filtering
  const validatedItems = validateAndFilterCandidates(candidates);
  
  // Phase 3: Convert to final format and sort
  const lineItems: LineItem[] = validatedItems.map(candidate => ({
    description: candidate.description,
    quantity: candidate.prices.quantity,
    unit_price: candidate.prices.unit_price,
    total_price: candidate.prices.total_price || 0,
    confidence: candidate.confidence
  }));
  
  return lineItems.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}

// Advanced candidate validation and filtering
function validateAndFilterCandidates(candidates: LineItemCandidate[]): LineItemCandidate[] {
  if (candidates.length === 0) return [];
  
  // Calculate average price for outlier detection
  const pricesWithValues = candidates
    .map(c => c.prices.total_price || c.prices.unit_price)
    .filter((p): p is number => p !== undefined && p > 0);
  
  const avgPrice = pricesWithValues.length > 0 
    ? pricesWithValues.reduce((sum, p) => sum + p, 0) / pricesWithValues.length 
    : 0;
  
  // Filter and enhance candidates
  const filtered = candidates.filter(candidate => {
    // Remove extreme outliers (prices 10x average)
    const itemPrice = candidate.prices.total_price || candidate.prices.unit_price;
    if (itemPrice && avgPrice > 0 && itemPrice > avgPrice * 10) {
      return false;
    }
    
    // Validate math consistency if we have quantity and unit price
    if (candidate.prices.quantity && candidate.prices.unit_price && candidate.prices.total_price) {
      const calculated = candidate.prices.quantity * candidate.prices.unit_price;
      const difference = Math.abs(calculated - candidate.prices.total_price);
      
      if (difference > 0.02) {
        // Math doesn't check out - reduce confidence
        candidate.confidence *= 0.7;
      } else {
        // Math is consistent - boost confidence
        candidate.confidence = Math.min(candidate.confidence * 1.2, 0.95);
      }
    }
    
    return candidate.confidence >= 0.3;
  });
  
  // Remove description-based duplicates
  const deduplicated = filtered.filter((candidate, index) => {
    const desc = candidate.description.toLowerCase();
    
    for (let j = 0; j < index; j++) {
      const existingDesc = filtered[j].description.toLowerCase();
      
      // Check for similarity (substring or high overlap)
      if (desc.includes(existingDesc) || existingDesc.includes(desc)) {
        return false;
      }
      
      // Check for word overlap
      const words1 = desc.split(/\s+/).filter(w => w.length > 2);
      const words2 = existingDesc.split(/\s+/).filter(w => w.length > 2);
      const overlap = words1.filter(w => words2.includes(w)).length;
      
      if (overlap >= Math.min(words1.length, words2.length) * 0.7) {
        return false;
      }
    }
    
    return true;
  });
  
  return deduplicated;
}