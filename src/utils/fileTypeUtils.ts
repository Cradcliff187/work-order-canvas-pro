// File type detection and validation utilities

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
];

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.ms-excel', // XLS
  'text/csv',
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain'
];

export const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES];

/**
 * Determine file type for storage categorization
 */
export function getFileTypeForStorage(file: File): 'photo' | 'document' {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return 'photo';
  }
  if (SUPPORTED_DOCUMENT_TYPES.includes(file.type)) {
    return 'document';
  }
  // Default to document for unknown types that pass validation
  return 'document';
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  return ALL_SUPPORTED_TYPES.includes(file.type);
}

/**
 * Check if file is an image type that needs compression
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Get human-readable list of supported formats
 */
export function getSupportedFormatsText(): string {
  return 'Images (JPEG, PNG, GIF, WebP, HEIC), Documents (PDF, Word, Excel, CSV, Text)';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Get appropriate icon name for file type
 */
export function getFileIcon(fileName: string, mimeType?: string): string {
  const extension = getFileExtension(fileName);
  
  // Image files
  if (mimeType && SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return 'image';
  }
  
  // Document types
  switch (extension) {
    case 'pdf':
      return 'file-text';
    case 'doc':
    case 'docx':
      return 'file-text';
    case 'xls':
    case 'xlsx':
      return 'file-spreadsheet';
    case 'csv':
      return 'file-spreadsheet';
    case 'txt':
      return 'file-text';
    default:
      return 'file';
  }
}