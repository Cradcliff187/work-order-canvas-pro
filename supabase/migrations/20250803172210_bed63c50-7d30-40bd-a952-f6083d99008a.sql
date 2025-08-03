-- Update storage bucket to support all file types from fileUtils.ts
-- First, update the existing work-order-attachments bucket to support all MIME types

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Image types
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/svg+xml',
  
  -- Document types
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- XLSX
  'application/vnd.ms-excel', -- XLS
  'text/csv',
  'application/csv',
  'application/msword', -- DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- DOCX
  'text/plain',
  
  -- Archive types
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  
  -- Code files
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'text/html',
  'text/css',
  'application/json',
  'text/xml',
  'application/xml',
  'text/x-yaml',
  'application/x-yaml',
  
  -- Video types
  'video/mp4',
  'video/avi',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-flv',
  'video/webm',
  'video/x-matroska',
  
  -- Audio types
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'audio/ogg',
  'audio/mp4'
]
WHERE id = 'work-order-attachments';

-- If the bucket doesn't exist, create it with all supported MIME types
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'work-order-attachments',
  'work-order-attachments',
  true,
  ARRAY[
    -- Image types
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/svg+xml',
    
    -- Document types
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    
    -- Archive types
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    
    -- Code files
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'application/json',
    'text/xml',
    'application/xml',
    'text/x-yaml',
    'application/x-yaml',
    
    -- Video types
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-flv',
    'video/webm',
    'video/x-matroska',
    
    -- Audio types
    'audio/mpeg',
    'audio/wav',
    'audio/flac',
    'audio/aac',
    'audio/ogg',
    'audio/mp4'
  ],
  10485760  -- 10MB file size limit
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;