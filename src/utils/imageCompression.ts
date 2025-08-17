// Image compression utility with HEIC support
const MAX_DIMENSION = 1920;
const MAX_HEIGHT = 1080;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const JPEG_QUALITY = 0.8;

// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Check if file type is supported
 */
export function isSupportedImageType(file: File): boolean {
  return SUPPORTED_FORMATS.includes(file.type.toLowerCase());
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}

/**
 * Convert HEIC/HEIF to JPEG using canvas
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const convertedFile = new File(
              [blob], 
              file.name.replace(/\.(heic|heif)$/i, '.jpg'), 
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            resolve(convertedFile);
          } else {
            reject(new Error('Failed to convert HEIC to JPEG'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => reject(new Error('Failed to load HEIC image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Adaptive quality calculation based on file size and device capabilities
 */
function getAdaptiveQuality(originalSize: number, targetSize: number = MAX_FILE_SIZE / 4): number {
  const sizeRatio = originalSize / targetSize;
  
  // Start with more aggressive compression to ensure size reduction
  if (sizeRatio <= 1) return 0.7;  // Reduced from JPEG_QUALITY (0.85)
  if (sizeRatio <= 2) return 0.6;  // Reduced from 0.7
  if (sizeRatio <= 4) return 0.5;  // Reduced from 0.6
  return 0.4; // More aggressive compression for very large files
}

/**
 * Get device-appropriate dimensions based on capabilities
 */
function getDeviceDimensions(): { maxWidth: number; maxHeight: number } {
  // Check available memory and device capabilities
  const isHighEnd = window.navigator.hardwareConcurrency >= 4;
  const hasHighMemory = (navigator as any).deviceMemory >= 4;
  
  if (isHighEnd && hasHighMemory) {
    return { maxWidth: MAX_DIMENSION, maxHeight: MAX_HEIGHT };
  }
  
  // Conservative limits for lower-end devices
  return { maxWidth: 1280, maxHeight: 720 };
}

/**
 * Compress image with progressive quality and async processing
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const deviceLimits = getDeviceDimensions();
  const {
    maxWidth = deviceLimits.maxWidth,
    maxHeight = deviceLimits.maxHeight,
    quality = getAdaptiveQuality(file.size),
    maxSizeBytes = MAX_FILE_SIZE
  } = options;

  const originalSize = file.size;
  onProgress?.(10);

  // Validate file type
  if (!isSupportedImageType(file)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  // Validate file size
  if (!isValidFileSize(file, maxSizeBytes)) {
    throw new Error(`File size exceeds maximum: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
  }

  onProgress?.(20);

  // Convert HEIC to JPEG if needed
  let processedFile = file;
  if (file.type.toLowerCase().includes('heic') || file.type.toLowerCase().includes('heif')) {
    processedFile = await convertHeicToJpeg(file);
    onProgress?.(40);
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = async () => {
      onProgress?.(60);
      
      // Calculate new dimensions while preserving aspect ratio
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth || height > maxHeight) {
        if (aspectRatio > maxWidth / maxHeight) {
          // Width is the limiting factor
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          // Height is the limiting factor
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;
      onProgress?.(70);

      // Use requestIdleCallback for non-blocking processing when available
      const processImage = () => {
        try {
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          onProgress?.(80);

          const outputFormat = processedFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const outputQuality = outputFormat === 'image/jpeg' ? quality : undefined;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob], 
                  processedFile.name, 
                  { type: outputFormat, lastModified: Date.now() }
                );

                const compressedSize = compressedFile.size;
                const compressionRatio = originalSize / compressedSize;
                onProgress?.(100);

                resolve({
                  file: compressedFile,
                  originalSize,
                  compressedSize,
                  compressionRatio
                });
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            outputFormat,
            outputQuality
          );
        } catch (error) {
          reject(new Error('Failed to process image'));
        }
      };

      // Use requestIdleCallback for better performance if available
      if ('requestIdleCallback' in window) {
        requestIdleCallback(processImage, { timeout: 5000 });
      } else {
        // Fallback to setTimeout for older browsers
        setTimeout(processImage, 0);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(processedFile);
  });
}

/**
 * Batch compress multiple images with concurrent processing
 */
export async function compressImages(
  files: File[], 
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number, currentFile?: string) => void,
  onFileProgress?: (fileName: string, progress: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  const maxConcurrent = Math.min(3, files.length); // Limit concurrent processing
  const chunks = [];
  
  // Split files into chunks for concurrent processing
  for (let i = 0; i < files.length; i += maxConcurrent) {
    chunks.push(files.slice(i, i + maxConcurrent));
  }
  
  let completed = 0;
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (file) => {
      try {
        const result = await compressImage(file, options, (progress) => {
          onFileProgress?.(file.name, progress);
        });
        completed++;
        onProgress?.(completed, files.length, file.name);
        return result;
      } catch (error) {
        console.error(`Failed to compress ${file.name}:`, error);
        throw error;
      }
    });
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
