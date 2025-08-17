export interface ImageQualityResult {
  score: number; // 0-100
  issues: QualityIssue[];
  recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'retake';
  suggestions: string[];
}

export interface QualityIssue {
  type: 'resolution' | 'fileSize' | 'aspectRatio' | 'lighting' | 'blur';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

/**
 * Analyze image quality for OCR processing
 */
export async function analyzeImageQuality(file: File): Promise<ImageQualityResult> {
  const result: ImageQualityResult = {
    score: 100,
    issues: [],
    recommendation: 'excellent',
    suggestions: []
  };

  try {
    // Basic file checks
    await checkFileSize(file, result);
    await checkImageProperties(file, result);
    
    // Calculate final score and recommendation
    calculateFinalScore(result);
    
    return result;
  } catch (error) {
    console.error('Error analyzing image quality:', error);
    return {
      score: 0,
      issues: [{ type: 'blur', severity: 'high', message: 'Could not analyze image quality' }],
      recommendation: 'retake',
      suggestions: ['Please try uploading the image again']
    };
  }
}

/**
 * Check file size and format
 */
async function checkFileSize(file: File, result: ImageQualityResult): Promise<void> {
  const sizeInMB = file.size / (1024 * 1024);
  
  // Too small (likely low quality)
  if (sizeInMB < 0.1) {
    result.issues.push({
      type: 'fileSize',
      severity: 'high',
      message: 'Image file is very small and may be low quality'
    });
    result.score -= 30;
    result.suggestions.push('Try taking a higher quality photo');
  }
  
  // Too large (might be unnecessarily large)
  else if (sizeInMB > 10) {
    result.issues.push({
      type: 'fileSize',
      severity: 'medium',
      message: 'Image file is very large'
    });
    result.score -= 10;
    result.suggestions.push('Consider compressing the image for faster upload');
  }
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    result.issues.push({
      type: 'resolution',
      severity: 'high',
      message: 'File is not a valid image format'
    });
    result.score -= 50;
  }
}

/**
 * Check image properties using canvas analysis
 */
async function checkImageProperties(file: File, result: ImageQualityResult): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        // Check resolution
        checkResolution(img, result);
        
        // Check aspect ratio
        checkAspectRatio(img, result);
        
        // Basic lighting/contrast analysis
        if (ctx) {
          canvas.width = Math.min(img.width, 200);
          canvas.height = Math.min(img.height, 200);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          checkLightingAndContrast(ctx, canvas, result);
        }
        
        resolve();
      } catch (error) {
        console.error('Error analyzing image properties:', error);
        resolve();
      }
    };
    
    img.onerror = () => {
      result.issues.push({
        type: 'resolution',
        severity: 'high',
        message: 'Could not load image for analysis'
      });
      result.score -= 40;
      resolve();
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check image resolution
 */
function checkResolution(img: HTMLImageElement, result: ImageQualityResult): void {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const totalPixels = width * height;
  
  // Very low resolution
  if (totalPixels < 100000) { // Less than ~300x300
    result.issues.push({
      type: 'resolution',
      severity: 'high',
      message: 'Image resolution is too low for accurate text recognition'
    });
    result.score -= 40;
    result.suggestions.push('Take a closer photo or use a higher resolution camera');
  }
  
  // Low resolution
  else if (totalPixels < 500000) { // Less than ~700x700
    result.issues.push({
      type: 'resolution',
      severity: 'medium',
      message: 'Image resolution is low and may affect text recognition'
    });
    result.score -= 20;
    result.suggestions.push('Try taking a closer photo for better text clarity');
  }
  
  // Very high resolution (might be unnecessarily large)
  else if (totalPixels > 8000000) { // More than ~3000x3000
    result.issues.push({
      type: 'resolution',
      severity: 'low',
      message: 'Image resolution is very high'
    });
    result.score -= 5;
    result.suggestions.push('Image will be processed but may take longer due to high resolution');
  }
}

/**
 * Check aspect ratio for receipt-like images
 */
function checkAspectRatio(img: HTMLImageElement, result: ImageQualityResult): void {
  const aspectRatio = img.naturalWidth / img.naturalHeight;
  
  // Extremely wide or tall images might not be receipts
  if (aspectRatio > 3 || aspectRatio < 0.2) {
    result.issues.push({
      type: 'aspectRatio',
      severity: 'medium',
      message: 'Image aspect ratio is unusual for a receipt'
    });
    result.score -= 15;
    result.suggestions.push('Make sure the entire receipt is visible and properly framed');
  }
}

/**
 * Analyze lighting and contrast
 */
function checkLightingAndContrast(
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  result: ImageQualityResult
): void {
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let brightnessSum = 0;
    let contrastSum = 0;
    const pixelCount = data.length / 4;
    
    // Calculate average brightness and basic contrast
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (luminance)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      brightnessSum += brightness;
    }
    
    const avgBrightness = brightnessSum / pixelCount;
    
    // Check if image is too dark
    if (avgBrightness < 60) {
      result.issues.push({
        type: 'lighting',
        severity: 'high',
        message: 'Image appears too dark'
      });
      result.score -= 25;
      result.suggestions.push('Try taking the photo in better lighting');
    }
    
    // Check if image is too bright (overexposed)
    else if (avgBrightness > 220) {
      result.issues.push({
        type: 'lighting',
        severity: 'medium',
        message: 'Image appears overexposed'
      });
      result.score -= 20;
      result.suggestions.push('Reduce lighting or avoid direct flash');
    }
    
    // Calculate basic contrast by checking standard deviation
    let varianceSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      varianceSum += Math.pow(brightness - avgBrightness, 2);
    }
    
    const stdDev = Math.sqrt(varianceSum / pixelCount);
    
    // Low contrast (text might be hard to read)
    if (stdDev < 30) {
      result.issues.push({
        type: 'lighting',
        severity: 'medium',
        message: 'Image has low contrast'
      });
      result.score -= 15;
      result.suggestions.push('Ensure good contrast between text and background');
    }
    
  } catch (error) {
    console.error('Error analyzing lighting/contrast:', error);
  }
}

/**
 * Calculate final score and recommendation
 */
function calculateFinalScore(result: ImageQualityResult): void {
  // Ensure score doesn't go below 0
  result.score = Math.max(0, result.score);
  
  // Determine recommendation based on score
  if (result.score >= 85) {
    result.recommendation = 'excellent';
  } else if (result.score >= 70) {
    result.recommendation = 'good';
  } else if (result.score >= 50) {
    result.recommendation = 'fair';
    result.suggestions.unshift('OCR may work but results might need verification');
  } else if (result.score >= 30) {
    result.recommendation = 'poor';
    result.suggestions.unshift('Consider retaking the photo for better results');
  } else {
    result.recommendation = 'retake';
    result.suggestions.unshift('Please retake the photo - current quality is too low for accurate processing');
  }
  
  // Add general suggestions if score is low
  if (result.score < 70 && result.suggestions.length === 0) {
    result.suggestions.push('Ensure receipt is flat and well-lit');
    result.suggestions.push('Hold camera steady and focus on the text');
  }
}

/**
 * Get quality badge color based on score
 */
export function getQualityBadgeColor(score: number): string {
  if (score >= 85) return 'bg-success/20 text-success';
  if (score >= 70) return 'bg-primary/20 text-primary';
  if (score >= 50) return 'bg-warning/20 text-warning';
  return 'bg-destructive/20 text-destructive';
}

/**
 * Get quality icon based on recommendation
 */
export function getQualityIcon(recommendation: string): string {
  switch (recommendation) {
    case 'excellent': return '🟢';
    case 'good': return '🟡';
    case 'fair': return '🟠';
    case 'poor': return '🔴';
    case 'retake': return '❌';
    default: return '❓';
  }
}