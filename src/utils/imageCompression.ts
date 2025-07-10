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
 * Compress image file with aspect ratio preservation
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = MAX_DIMENSION,
    maxHeight = MAX_HEIGHT,
    quality = JPEG_QUALITY,
    maxSizeBytes = MAX_FILE_SIZE
  } = options;

  const originalSize = file.size;

  // Validate file type
  if (!isSupportedImageType(file)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  // Validate file size
  if (!isValidFileSize(file, maxSizeBytes)) {
    throw new Error(`File size exceeds maximum: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
  }

  // Convert HEIC to JPEG if needed
  let processedFile = file;
  if (file.type.toLowerCase().includes('heic') || file.type.toLowerCase().includes('heif')) {
    processedFile = await convertHeicToJpeg(file);
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
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

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

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
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(processedFile);
  });
}

/**
 * Batch compress multiple images
 */
export async function compressImages(
  files: File[], 
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await compressImage(files[i], options);
      results.push(result);
      onProgress?.(i + 1, files.length);
    } catch (error) {
      console.error(`Failed to compress ${files[i].name}:`, error);
      throw error;
    }
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

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}