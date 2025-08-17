// Confidence calculation utilities

type ExtractionMethod = 'direct_ocr' | 'pattern_match' | 'fuzzy_match' | 'calculated' | 'inferred' | 'fallback';

export interface FieldConfidence {
  score: number;
  method: ExtractionMethod;
  source?: string;
  position?: number;
  validated?: boolean;
}

export function calculateBaseConfidence(method: ExtractionMethod, hasValidation: boolean = false): number {
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

export function calculateOverallConfidence(confidence: any, spatialValidation?: any): number {
  // Enhanced weighted average with spatial validation integration
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
  
  let finalScore = Math.max(overall - penalty, 0);
  
  // Apply spatial validation boost
  if (spatialValidation) {
    if (spatialValidation.mathConsistency) finalScore *= 1.1;
    if (spatialValidation.layoutConsistency) finalScore *= 1.05;
    if (spatialValidation.proximityScore > 0.8) finalScore *= 1.03;
  }
  
  return Math.min(finalScore, 0.95);
}

// Calculate distance-based confidence for spatial proximity
export function calculateProximityConfidence(keywordPosition: any, valuePosition: any): number {
  if (!keywordPosition || !valuePosition) return 0;
  
  const distance = Math.sqrt(
    Math.pow(valuePosition.x - keywordPosition.x, 2) + 
    Math.pow(valuePosition.y - keywordPosition.y, 2)
  );
  
  // Closer = higher confidence (exponential decay)
  return Math.max(0, Math.exp(-distance / 200));
}

// Enhanced confidence with spatial layout validation
export function calculateSpatialConfidence(baseConfidence: number, spatialFactors: {
  proximityScore?: number;
  alignmentScore?: number;
  contextScore?: number;
}): number {
  let enhanced = baseConfidence;
  
  if (spatialFactors.proximityScore) {
    enhanced *= (0.7 + 0.3 * spatialFactors.proximityScore);
  }
  
  if (spatialFactors.alignmentScore) {
    enhanced *= (0.8 + 0.2 * spatialFactors.alignmentScore);
  }
  
  if (spatialFactors.contextScore) {
    enhanced *= (0.9 + 0.1 * spatialFactors.contextScore);
  }
  
  return Math.min(enhanced, 0.95);
}

export function getExtractionQuality(overallConfidence: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (overallConfidence >= 0.8) return 'excellent';
  if (overallConfidence >= 0.65) return 'good';
  if (overallConfidence >= 0.45) return 'fair';
  return 'poor';
}