// Line item extraction and parsing functionality

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price: number;
  confidence?: number;
}

interface ItemPrices {
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

function cleanDescription(text: string): string {
  return text
    .replace(/^\d+\s*[-\.]?\s*/, '') // Remove leading item numbers
    .replace(/\s*\$[\d\.\,]+$/, '') // Remove trailing prices
    .replace(/\s*\d+\.\d{2}$/, '') // Remove trailing decimal amounts
    .replace(/\s*x\s*\d+(\.\d{2})?$/, '') // Remove trailing 'x 12.34' patterns
    .replace(/\s*\d+\s*@\s*\$?[\d\.\,]+$/, '') // Remove 'qty @ price' patterns
    .replace(/^\W+|\W+$/g, '') // Trim non-word characters
    .replace(/[^\w\s\-\.\/&%#]+/g, ' ') // Remove excessive special characters
    .trim();
}

function extractPrices(text: string): ItemPrices {
  const prices: ItemPrices = {};
  
  // Look for price patterns
  const priceMatches = text.match(/\$?(\d{1,6}(?:\.\d{2})?)/g) || [];
  const numericPrices = priceMatches
    .map(match => parseFloat(match.replace(/[$,]/g, '')))
    .filter(price => price > 0 && price < 999999);
  
  // Look for quantity patterns
  const qtyMatch = text.match(/(?:qty|x)\s*(\d+)/i);
  if (qtyMatch) {
    prices.quantity = parseInt(qtyMatch[1]);
  }
  
  // Look for unit price with @ symbol
  const unitPriceMatch = text.match(/(\d+(?:\.\d{2})?)\s*@\s*\$?(\d+(?:\.\d{2})?)/);
  if (unitPriceMatch) {
    prices.quantity = parseInt(unitPriceMatch[1]);
    prices.unitPrice = parseFloat(unitPriceMatch[2]);
    prices.totalPrice = prices.quantity * prices.unitPrice;
  } else if (numericPrices.length >= 2) {
    // Multiple prices found - assume last one is total
    prices.totalPrice = numericPrices[numericPrices.length - 1];
    if (numericPrices.length >= 2) {
      prices.unitPrice = numericPrices[numericPrices.length - 2];
      if (prices.quantity && prices.unitPrice) {
        // Verify calculation
        const calculatedTotal = prices.quantity * prices.unitPrice;
        if (Math.abs(calculatedTotal - prices.totalPrice) > 0.01) {
          prices.unitPrice = undefined; // Clear if doesn't match
        }
      }
    }
  } else if (numericPrices.length === 1) {
    prices.totalPrice = numericPrices[0];
  }
  
  return prices;
}

function calculateLineItemConfidence(description: string, prices: ItemPrices): number {
  let confidence = 0.5; // Base confidence
  
  // Boost for good description
  if (description && description.length >= 3) {
    confidence += 0.2;
    if (description.length >= 10) confidence += 0.1;
    if (/^[A-Za-z]/.test(description)) confidence += 0.1; // Starts with letter
  }
  
  // Boost for having price
  if (prices.totalPrice && prices.totalPrice > 0) {
    confidence += 0.2;
  }
  
  // Boost for having quantity
  if (prices.quantity && prices.quantity > 0) {
    confidence += 0.1;
  }
  
  // Boost for having unit price that matches total
  if (prices.unitPrice && prices.quantity && prices.totalPrice) {
    const calculatedTotal = prices.quantity * prices.unitPrice;
    if (Math.abs(calculatedTotal - prices.totalPrice) <= 0.01) {
      confidence += 0.15;
    }
  }
  
  return Math.min(confidence, 0.95);
}

export function extractLineItems(text: string): LineItem[] {
  const lines = text.split('\n');
  const lineItems: LineItem[] = [];
  
  // Skip patterns that are likely not line items
  const skipPatterns = [
    /^(subtotal|total|tax|discount|change|cash|credit|debit|visa|mastercard|amex|discover)/i,
    /^(thank\s+you|have\s+a\s+great|receipt|store|cashier|date|time)/i,
    /^[\-=\*\s]{3,}$/,
    /^\d+\s*$/,
    /^[A-Za-z]\s*$/,
    /^store\s*#?\d+/i,
    /^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{2,4}/,
    /^balance|amount\s+due|payment/i
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length < 3) continue;
    
    // Skip lines that match skip patterns
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }
    
    // Look for lines with prices
    if (!/\$?\d+\.?\d{0,2}/.test(line)) {
      continue;
    }
    
    const prices = extractPrices(line);
    if (!prices.totalPrice || prices.totalPrice <= 0) {
      continue;
    }
    
    const description = cleanDescription(line);
    
    // If no description but we have a price, create a fallback description
    if (!description || description.length < 1) {
      // Try to extract product codes or use fallback
      const codeMatch = line.match(/^(\d{6,14}|\w{3,10})/);
      if (codeMatch) {
        const fallbackDescription = `Item ${codeMatch[1]}`;
        const confidence = calculateLineItemConfidence(fallbackDescription, prices);
        
        lineItems.push({
          description: fallbackDescription,
          quantity: prices.quantity,
          unit_price: prices.unitPrice,
          total_price: prices.totalPrice,
          confidence
        });
      } else if (prices.totalPrice) {
        const fallbackDescription = `Item $${prices.totalPrice.toFixed(2)}`;
        const confidence = calculateLineItemConfidence(fallbackDescription, prices);
        
        lineItems.push({
          description: fallbackDescription,
          quantity: prices.quantity,
          unit_price: prices.unitPrice,
          total_price: prices.totalPrice,
          confidence
        });
      }
      continue;
    }
    
    const confidence = calculateLineItemConfidence(description, prices);
    
    lineItems.push({
      description,
      quantity: prices.quantity,
      unit_price: prices.unitPrice,
      total_price: prices.totalPrice,
      confidence
    });
  }
  
  // Sort by confidence and remove duplicates
  lineItems.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  // Remove likely duplicates based on description similarity
  const filtered: LineItem[] = [];
  for (const item of lineItems) {
    const isDuplicate = filtered.some(existing => 
      existing.description.toLowerCase() === item.description.toLowerCase() ||
      (Math.abs(existing.total_price - item.total_price) < 0.01 && 
       existing.description.slice(0, 10) === item.description.slice(0, 10))
    );
    
    if (!isDuplicate) {
      filtered.push(item);
    }
  }
  
  return filtered;
}