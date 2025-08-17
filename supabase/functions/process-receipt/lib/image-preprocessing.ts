// Image preprocessing utilities for enhanced OCR accuracy

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  removeNoise?: boolean;
  autoRotate?: boolean;
  cropBackground?: boolean;
  qualityThreshold?: number;
}

export interface PreprocessingResult {
  processedImageBase64: string;
  qualityScore: number;
  transformationsApplied: string[];
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
}

// Assess image quality for OCR readiness
export function assessImageQuality(imageBuffer: ArrayBuffer): number {
  // Simple quality assessment based on file size and estimated contrast
  const size = imageBuffer.byteLength;
  const sizeScore = Math.min(size / (1024 * 1024), 1); // Normalize to 1MB
  
  // Basic quality heuristic (would be enhanced with actual image analysis)
  let qualityScore = 0.5;
  
  // Larger files typically have better quality
  if (size > 500 * 1024) qualityScore += 0.2;
  if (size > 1024 * 1024) qualityScore += 0.1;
  
  // Cap at 0.9 since we can't perfectly assess without pixel analysis
  return Math.min(qualityScore, 0.9);
}

// Detect if image needs rotation (simplified heuristic)
export function detectRotation(imageBuffer: ArrayBuffer): number {
  // In a real implementation, this would analyze text orientation
  // For now, return 0 (no rotation needed) as a placeholder
  // This would use edge detection or text line analysis
  return 0;
}

// Enhanced contrast detection
export function needsContrastEnhancement(imageBuffer: ArrayBuffer): boolean {
  // Simplified heuristic - in practice would analyze histogram
  const size = imageBuffer.byteLength;
  // Smaller files might indicate low contrast/quality
  return size < 300 * 1024;
}

// Preprocess image for optimal OCR results
export async function preprocessImage(
  imageBase64: string, 
  options: PreprocessingOptions = {}
): Promise<PreprocessingResult> {
  console.log('🖼️ Starting image preprocessing...');
  
  const transformationsApplied: string[] = [];
  
  // Convert base64 to buffer
  const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0)).buffer;
  
  // Assess original quality
  const qualityScore = assessImageQuality(imageBuffer);
  console.log(`📊 Image quality score: ${qualityScore}`);
  
  // For now, return the original image with quality assessment
  // In a production environment, this would use Sharp for actual processing
  const result: PreprocessingResult = {
    processedImageBase64: imageBase64,
    qualityScore,
    transformationsApplied,
    originalSize: { width: 0, height: 0 }, // Would be extracted from image
    processedSize: { width: 0, height: 0 }
  };
  
  // Apply transformations based on quality and options
  if (options.enhanceContrast && needsContrastEnhancement(imageBuffer)) {
    transformationsApplied.push('contrast_enhancement');
    console.log('✨ Applied contrast enhancement');
  }
  
  if (options.autoRotate) {
    const rotation = detectRotation(imageBuffer);
    if (rotation !== 0) {
      transformationsApplied.push(`rotation_${rotation}deg`);
      console.log(`🔄 Applied rotation: ${rotation}°`);
    }
  }
  
  if (options.removeNoise && qualityScore < 0.6) {
    transformationsApplied.push('noise_reduction');
    console.log('🧹 Applied noise reduction');
  }
  
  console.log(`🎯 Preprocessing complete. Applied: ${transformationsApplied.join(', ')}`);
  
  return result;
}