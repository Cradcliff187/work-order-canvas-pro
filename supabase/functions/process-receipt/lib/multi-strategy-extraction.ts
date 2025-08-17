// Multi-strategy extraction engine for universal document processing

import { DocumentStructure, analyzeDocumentStructure, getLineContext } from './document-structure.ts';
import { processOCRText, ProcessedText, extractStructuredElements } from './advanced-text-processing.ts';

export interface ExtractionStrategy {
  name: string;
  priority: number;
  confidence: number;
  applicable: (structure: DocumentStructure, text: ProcessedText) => boolean;
  extract: (structure: DocumentStructure, text: ProcessedText) => ExtractionResult;
}

export interface ExtractionResult {
  vendor?: {
    name: string;
    confidence: number;
    method: string;
    raw: string;
  };
  amounts?: {
    total?: { value: number; confidence: number; method: string; };
    subtotal?: { value: number; confidence: number; method: string; };
    tax?: { value: number; confidence: number; method: string; };
  };
  date?: {
    value: string;
    confidence: number;
    method: string;
    format: string;
  };
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    confidence: number;
  }>;
  strategy: string;
  confidence: number;
}

export interface ConsolidatedResult {
  vendor?: string;
  vendor_confidence?: number;
  total?: number;
  total_confidence?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  date_confidence?: number;
  lineItems?: any[];
  extraction_methods: string[];
  overall_confidence: number;
  validation_passed: boolean;
}

// Strategy 1: Structure-aware pattern matching
const structureAwareStrategy: ExtractionStrategy = {
  name: 'structure_aware',
  priority: 90,
  confidence: 0,
  applicable: (structure) => structure.confidence > 0.6 && structure.sections.length >= 2,
  extract: (structure, text) => {
    console.log('🎯 Applying structure-aware extraction strategy...');
    const result: ExtractionResult = { strategy: 'structure_aware', confidence: 0 };
    
    // Extract from totals section
    const totalsSection = structure.sections.find(s => s.type === 'totals');
    if (totalsSection) {
      result.amounts = extractFromTotalsSection(totalsSection.content);
    }
    
    // Extract vendor from header section
    const headerSection = structure.sections.find(s => s.type === 'header');
    if (headerSection) {
      result.vendor = extractVendorFromHeader(headerSection.content);
    }
    
    // Extract line items from items section
    const itemsSection = structure.sections.find(s => s.type === 'items');
    if (itemsSection) {
      result.lineItems = extractItemsFromSection(itemsSection.content);
    }
    
    result.confidence = calculateStrategyConfidence(result);
    return result;
  }
};

// Strategy 2: Pattern-based extraction with context
const contextualPatternStrategy: ExtractionStrategy = {
  name: 'contextual_pattern',
  priority: 80,
  confidence: 0,
  applicable: () => true, // Always applicable as fallback
  extract: (structure, text) => {
    console.log('🎯 Applying contextual pattern extraction strategy...');
    const result: ExtractionResult = { strategy: 'contextual_pattern', confidence: 0 };
    
    const lines = text.lines;
    const elements = extractStructuredElements(text.cleaned);
    
    // Enhanced total extraction with context
    result.amounts = extractAmountsWithContext(lines, elements.monetary);
    
    // Vendor extraction with fuzzy matching
    result.vendor = extractVendorWithFuzzy(text.cleaned);
    
    // Date extraction with validation
    result.date = extractDateWithValidation(elements.dates, text.cleaned);
    
    result.confidence = calculateStrategyConfidence(result);
    return result;
  }
};

// Strategy 3: Mathematical validation strategy
const mathematicalStrategy: ExtractionStrategy = {
  name: 'mathematical',
  priority: 70,
  confidence: 0,
  applicable: (structure, text) => {
    const monetaryElements = extractStructuredElements(text.cleaned).monetary;
    return monetaryElements.length >= 3; // Need at least 3 amounts for math validation
  },
  extract: (structure, text) => {
    console.log('🎯 Applying mathematical validation strategy...');
    const result: ExtractionResult = { strategy: 'mathematical', confidence: 0 };
    
    const elements = extractStructuredElements(text.cleaned);
    result.amounts = extractAmountsWithMath(elements.monetary, text.lines);
    
    result.confidence = calculateStrategyConfidence(result);
    return result;
  }
};

// Strategy 4: Heuristic-based extraction
const heuristicStrategy: ExtractionStrategy = {
  name: 'heuristic',
  priority: 60,
  confidence: 0,
  applicable: () => true, // Always applicable as last resort
  extract: (structure, text) => {
    console.log('🎯 Applying heuristic extraction strategy...');
    const result: ExtractionResult = { strategy: 'heuristic', confidence: 0 };
    
    const elements = extractStructuredElements(text.cleaned);
    
    // Heuristic amount extraction (largest amounts, position-based)
    result.amounts = extractAmountsHeuristic(elements.monetary, text.lines);
    
    // Simple vendor extraction from top lines
    result.vendor = extractVendorHeuristic(text.lines.slice(0, 5));
    
    result.confidence = Math.max(calculateStrategyConfidence(result) * 0.7, 0.3); // Lower base confidence
    return result;
  }
};

// All available strategies
const EXTRACTION_STRATEGIES: ExtractionStrategy[] = [
  structureAwareStrategy,
  contextualPatternStrategy,
  mathematicalStrategy,
  heuristicStrategy
];

export function runMultiStrategyExtraction(text: string): ConsolidatedResult {
  console.log('🚀 Starting multi-strategy extraction engine...');
  
  // Step 1: Advanced text processing
  const processedText = processOCRText(text, {
    aggressive: true,
    preserveFormatting: false,
    fixCommonOCRErrors: true,
    normalizeSpacing: true
  });
  
  console.log(`📝 Text processing complete: ${processedText.quality} quality, ${processedText.corrections.length} corrections`);
  
  // Step 2: Analyze document structure
  const structure = analyzeDocumentStructure(processedText.cleaned);
  
  // Step 3: Run applicable strategies
  const strategyResults: ExtractionResult[] = [];
  
  for (const strategy of EXTRACTION_STRATEGIES) {
    if (strategy.applicable(structure, processedText)) {
      console.log(`🎯 Running strategy: ${strategy.name}`);
      const result = strategy.extract(structure, processedText);
      if (result.confidence > 0.2) { // Only keep results with reasonable confidence
        strategyResults.push(result);
      }
    }
  }
  
  // Step 4: Consolidate results
  const consolidated = consolidateResults(strategyResults);
  
  console.log(`🎯 Multi-strategy extraction complete: ${strategyResults.length} strategies applied, confidence: ${consolidated.overall_confidence.toFixed(3)}`);
  
  return consolidated;
}

function extractFromTotalsSection(content: string): ExtractionResult['amounts'] {
  const amounts: ExtractionResult['amounts'] = {};
  
  // Enhanced patterns for totals section
  const patterns = [
    { regex: /(?:^|\n)\s*(?:grand\s+)?total\s*:?\s*\$?(\d+\.?\d*)/i, field: 'total', confidence: 0.95 },
    { regex: /(?:^|\n)\s*(?:sub\s*)?total\s*:?\s*\$?(\d+\.?\d*)/i, field: 'subtotal', confidence: 0.90 },
    { regex: /(?:^|\n)\s*(?:sales\s+)?tax\s*:?\s*\$?(\d+\.?\d*)/i, field: 'tax', confidence: 0.88 },
    { regex: /(?:^|\n)\s*amount\s+due\s*:?\s*\$?(\d+\.?\d*)/i, field: 'total', confidence: 0.92 }
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern.regex);
    if (match) {
      const value = parseFloat(match[1]);
      if (value > 0 && value < 999999) {
        const field = pattern.field as 'total' | 'subtotal' | 'tax';
        if (!amounts[field] || pattern.confidence > amounts[field]!.confidence) {
          amounts[field] = {
            value,
            confidence: pattern.confidence,
            method: 'structure_aware_totals'
          };
        }
      }
    }
  }
  
  return amounts;
}

function extractVendorFromHeader(content: string): ExtractionResult['vendor'] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Known vendor patterns
  const vendorPatterns = [
    { regex: /\b(?:the\s+)?home\s+depot\b/i, name: 'Home Depot', confidence: 0.95 },
    { regex: /\blowe'?s\b/i, name: 'Lowes', confidence: 0.95 },
    { regex: /\bwalmart\b/i, name: 'Walmart', confidence: 0.95 },
    { regex: /\btarget\b/i, name: 'Target', confidence: 0.85 },
    { regex: /\bcostco\b/i, name: 'Costco', confidence: 0.95 }
  ];
  
  for (const line of lines) {
    for (const pattern of vendorPatterns) {
      if (pattern.regex.test(line)) {
        return {
          name: pattern.name,
          confidence: pattern.confidence,
          method: 'structure_aware_header',
          raw: line
        };
      }
    }
  }
  
  // Fallback: use first substantial line as vendor
  const firstLine = lines[0];
  if (firstLine && firstLine.length > 3 && /^[A-Z\s&'-]+$/.test(firstLine)) {
    return {
      name: firstLine.trim(),
      confidence: 0.6,
      method: 'structure_aware_header_fallback',
      raw: firstLine
    };
  }
  
  return undefined;
}

function extractItemsFromSection(content: string): ExtractionResult['lineItems'] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items: ExtractionResult['lineItems'] = [];
  
  for (const line of lines) {
    // Pattern: Description + quantity + price
    const itemMatch = line.match(/^(.+?)\s+(\d+)\s+\$?(\d+\.?\d*)$/);
    if (itemMatch) {
      items.push({
        description: itemMatch[1].trim(),
        quantity: parseInt(itemMatch[2]),
        totalPrice: parseFloat(itemMatch[3]),
        confidence: 0.8
      });
      continue;
    }
    
    // Pattern: Description + price
    const simpleMatch = line.match(/^(.+?)\s+\$(\d+\.?\d*)$/);
    if (simpleMatch) {
      items.push({
        description: simpleMatch[1].trim(),
        totalPrice: parseFloat(simpleMatch[2]),
        confidence: 0.7
      });
    }
  }
  
  return items.length > 0 ? items : undefined;
}

function extractAmountsWithContext(lines: string[], monetaryElements: string[]): ExtractionResult['amounts'] {
  const amounts: ExtractionResult['amounts'] = {};
  
  // Extract amounts based on nearby context words
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const context = getLineContext(lines, i, 1);
    
    // Look for total patterns
    const totalMatch = line.match(/\b(?:grand\s+)?total\s*:?\s*\$?(\d+\.?\d*)/i);
    if (totalMatch) {
      const value = parseFloat(totalMatch[1]);
      amounts.total = {
        value,
        confidence: 0.9,
        method: 'contextual_pattern_total'
      };
    }
    
    // Look for subtotal patterns
    const subtotalMatch = line.match(/\bsubtotal\s*:?\s*\$?(\d+\.?\d*)/i);
    if (subtotalMatch) {
      const value = parseFloat(subtotalMatch[1]);
      amounts.subtotal = {
        value,
        confidence: 0.85,
        method: 'contextual_pattern_subtotal'
      };
    }
    
    // Look for tax patterns
    const taxMatch = line.match(/\btax\s*:?\s*\$?(\d+\.?\d*)/i);
    if (taxMatch) {
      const value = parseFloat(taxMatch[1]);
      amounts.tax = {
        value,
        confidence: 0.85,
        method: 'contextual_pattern_tax'
      };
    }
  }
  
  return amounts;
}

function extractAmountsWithMath(monetaryElements: string[], lines: string[]): ExtractionResult['amounts'] {
  const amounts: ExtractionResult['amounts'] = {};
  
  // Parse all monetary values
  const values = monetaryElements
    .map(el => parseFloat(el.replace(/[^\d\.]/g, '')))
    .filter(val => val > 0 && val < 999999)
    .sort((a, b) => b - a); // Largest first
  
  if (values.length < 3) return amounts;
  
  // Try to find subtotal + tax = total combinations
  for (let i = 0; i < values.length; i++) {
    const total = values[i];
    for (let j = i + 1; j < values.length; j++) {
      const subtotal = values[j];
      for (let k = j + 1; k < values.length; k++) {
        const tax = values[k];
        
        // Check if subtotal + tax ≈ total (within $0.02 tolerance)
        if (Math.abs((subtotal + tax) - total) <= 0.02) {
          amounts.total = { value: total, confidence: 0.9, method: 'mathematical_validation' };
          amounts.subtotal = { value: subtotal, confidence: 0.85, method: 'mathematical_validation' };
          amounts.tax = { value: tax, confidence: 0.85, method: 'mathematical_validation' };
          
          console.log(`✅ Mathematical validation: ${subtotal} + ${tax} = ${total}`);
          return amounts;
        }
      }
    }
  }
  
  // If no perfect math, use largest value as total with lower confidence
  if (values.length > 0) {
    amounts.total = { value: values[0], confidence: 0.6, method: 'mathematical_largest' };
  }
  
  return amounts;
}

function extractAmountsHeuristic(monetaryElements: string[], lines: string[]): ExtractionResult['amounts'] {
  const amounts: ExtractionResult['amounts'] = {};
  
  const values = monetaryElements
    .map(el => parseFloat(el.replace(/[^\d\.]/g, '')))
    .filter(val => val > 0 && val < 999999);
  
  if (values.length === 0) return amounts;
  
  // Simple heuristic: largest value is likely the total
  const maxValue = Math.max(...values);
  amounts.total = { value: maxValue, confidence: 0.5, method: 'heuristic_largest' };
  
  return amounts;
}

function extractVendorWithFuzzy(text: string): ExtractionResult['vendor'] {
  // Simplified vendor extraction - could be expanded with fuzzy matching
  const firstLines = text.split('\n').slice(0, 3);
  for (const line of firstLines) {
    if (/depot/i.test(line)) {
      return { name: 'Home Depot', confidence: 0.8, method: 'contextual_fuzzy', raw: line };
    }
    if (/lowe/i.test(line)) {
      return { name: 'Lowes', confidence: 0.8, method: 'contextual_fuzzy', raw: line };
    }
  }
  return undefined;
}

function extractVendorHeuristic(lines: string[]): ExtractionResult['vendor'] {
  const firstLine = lines[0];
  if (firstLine && firstLine.length > 3) {
    return { name: firstLine, confidence: 0.4, method: 'heuristic_first_line', raw: firstLine };
  }
  return undefined;
}

function extractDateWithValidation(dates: string[], text: string): ExtractionResult['date'] {
  // Simple date extraction - could be enhanced with validation
  if (dates.length > 0) {
    return {
      value: dates[0],
      confidence: 0.8,
      method: 'contextual_pattern',
      format: 'detected'
    };
  }
  return undefined;
}

function calculateStrategyConfidence(result: ExtractionResult): number {
  let confidence = 0;
  let factors = 0;
  
  if (result.vendor) {
    confidence += result.vendor.confidence;
    factors++;
  }
  
  if (result.amounts?.total) {
    confidence += result.amounts.total.confidence;
    factors++;
  }
  
  if (result.date) {
    confidence += result.date.confidence;
    factors++;
  }
  
  if (result.lineItems && result.lineItems.length > 0) {
    const avgItemConfidence = result.lineItems.reduce((sum, item) => sum + item.confidence, 0) / result.lineItems.length;
    confidence += avgItemConfidence;
    factors++;
  }
  
  return factors > 0 ? confidence / factors : 0;
}

function consolidateResults(results: ExtractionResult[]): ConsolidatedResult {
  if (results.length === 0) {
    return {
      extraction_methods: [],
      overall_confidence: 0,
      validation_passed: false
    };
  }
  
  // Sort by confidence and strategy priority
  results.sort((a, b) => b.confidence - a.confidence);
  
  const consolidated: ConsolidatedResult = {
    extraction_methods: results.map(r => r.strategy),
    overall_confidence: 0,
    validation_passed: false
  };
  
  // Take best results for each field
  for (const result of results) {
    if (result.vendor && !consolidated.vendor) {
      consolidated.vendor = result.vendor.name;
      consolidated.vendor_confidence = result.vendor.confidence;
    }
    
    if (result.amounts?.total && !consolidated.total) {
      consolidated.total = result.amounts.total.value;
      consolidated.total_confidence = result.amounts.total.confidence;
    }
    
    if (result.amounts?.subtotal && !consolidated.subtotal) {
      consolidated.subtotal = result.amounts.subtotal.value;
    }
    
    if (result.amounts?.tax && !consolidated.tax) {
      consolidated.tax = result.amounts.tax.value;
    }
    
    if (result.date && !consolidated.date) {
      consolidated.date = result.date.value;
      consolidated.date_confidence = result.date.confidence;
    }
    
    if (result.lineItems && !consolidated.lineItems) {
      consolidated.lineItems = result.lineItems;
    }
  }
  
  // Calculate overall confidence
  const confidenceFactors = [
    consolidated.vendor_confidence || 0,
    consolidated.total_confidence || 0,
    consolidated.date_confidence || 0
  ].filter(c => c > 0);
  
  consolidated.overall_confidence = confidenceFactors.length > 0 
    ? confidenceFactors.reduce((sum, c) => sum + c, 0) / confidenceFactors.length
    : 0;
  
  // Validation
  consolidated.validation_passed = (consolidated.vendor_confidence || 0) >= 0.5 && 
                                  (consolidated.total_confidence || 0) >= 0.5;
  
  return consolidated;
}