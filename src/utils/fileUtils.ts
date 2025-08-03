/**
 * Consolidated file utilities for type detection, categorization, and formatting
 */

import { supabase } from '@/integrations/supabase/client';

// Supported file types
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
export function isImageFile(fileName: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/')) {
    return true;
  }
  
  const extension = getFileExtension(fileName);
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'heic', 'heif'].includes(extension);
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
 * Get the appropriate Lucide icon name for a file based on its name and type
 */
export function getFileIcon(fileName: string, mimeType?: string): string {
  const extension = getFileExtension(fileName);
  
  // Image files
  if (mimeType && mimeType.startsWith('image/')) {
    return 'image';
  }
  
  // Video files
  if (mimeType && mimeType.startsWith('video/')) {
    return 'film';
  }
  
  // Audio files
  if (mimeType && mimeType.startsWith('audio/')) {
    return 'music';
  }
  
  // Document types by extension
  switch (extension) {
    case 'pdf':
      return 'file-text';
    case 'doc':
    case 'docx':
      return 'file-text';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'file-spreadsheet';
    case 'ppt':
    case 'pptx':
      return 'presentation';
    case 'txt':
    case 'rtf':
      return 'file-text';
    
    // Archive files
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return 'archive';
    
    // Code files
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'json':
    case 'xml':
    case 'yml':
    case 'yaml':
    case 'php':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'sh':
      return 'code';
    
    // Video files by extension
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
    case 'webm':
    case 'mkv':
      return 'film';
    
    // Audio files by extension
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
    case 'ogg':
    case 'm4a':
      return 'music';
    
    // Image files by extension
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
    case 'webp':
    case 'heic':
    case 'heif':
      return 'image';
    
    default:
      return 'file';
  }
}

/**
 * Get the file category for grouping purposes
 */
export function getFileCategory(fileName: string, mimeType?: string): string {
  const extension = getFileExtension(fileName);
  
  // Image files
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'heic', 'heif'].includes(extension)) {
    return 'Images';
  }
  
  // Video files
  if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
    return 'Videos';
  }
  
  // Audio files
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)) {
    return 'Audio';
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return 'Spreadsheets';
  }
  
  // Presentations
  if (['ppt', 'pptx'].includes(extension)) {
    return 'Presentations';
  }
  
  // PDFs
  if (extension === 'pdf') {
    return 'PDFs';
  }
  
  // Word documents
  if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return 'Documents';
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'Archives';
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'yml', 'yaml', 'php', 'py', 'java', 'cpp', 'c', 'sh'].includes(extension)) {
    return 'Code';
  }
  
  return 'Other';
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get all unique file categories from a list of files
 */
export function getFileCategoriesFromList(files: Array<{ file_name: string; file_type?: string }>): string[] {
  const categories = new Set<string>();
  
  files.forEach(file => {
    const category = getFileCategory(file.file_name, file.file_type);
    categories.add(category);
  });
  
  return Array.from(categories).sort();
}

/**
 * Get Supabase storage URL for file attachments
 */
export function getImageUrl(filePath: string): string {
  if (filePath.startsWith('http')) return filePath;
  
  const { data } = supabase.storage
    .from('work-order-attachments')
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}