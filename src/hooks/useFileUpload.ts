import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { compressImage, type CompressionResult } from "@/utils/imageCompression";
import { 
  isSupportedFileType, 
  getFileTypeForStorage, 
  isImageFile, 
  getSupportedFormatsText 
} from "@/utils/fileUtils";

// Upload context types
export type UploadContext = 'avatar' | 'workOrder' | 'invoice' | 'report' | 'receipt';

// Context-specific configurations
const uploadConfigs = {
  avatar: {
    bucket: 'avatars' as const,
    maxSize: 5 * 1024 * 1024, // 5MB
    processing: { 
      crop: true,
      compress: true,
      maxDimensions: { width: 500, height: 500 } 
    },
    dbTable: null, // stored in profiles.avatar_url
    supportedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    pathStructure: '{user_id}/avatar.jpg'
  },
  workOrder: {
    bucket: 'work-order-attachments' as const,
    maxSize: 50 * 1024 * 1024, // 50MB
    processing: { compress: true },
    dbTable: 'work_order_attachments' as const,
    supportedTypes: [] as string[], // Use default supported types
    pathStructure: '{user_id}/{work_order_id}/{timestamp}_{filename}'
  },
  invoice: {
    bucket: 'work-order-attachments' as const,
    maxSize: 10 * 1024 * 1024, // 10MB
    processing: { compress: false },
    dbTable: 'invoice_attachments' as const,
    supportedTypes: [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    pathStructure: 'work-orders/{work_order_id}/invoices/{timestamp}_{filename}'
  },
  report: {
    bucket: 'work-order-attachments' as const,
    maxSize: 50 * 1024 * 1024, // 50MB
    processing: { compress: true },
    dbTable: 'work_order_attachments' as const,
    supportedTypes: [] as string[], // Use default supported types
    pathStructure: 'work-orders/{work_order_id}/reports/{timestamp}_{filename}'
  },
  receipt: {
    bucket: 'work-order-attachments' as const,
    maxSize: 10 * 1024 * 1024, // 10MB
    processing: { compress: true, enhanceReadability: true },
    dbTable: 'work_order_attachments' as const,
    supportedTypes: [] as string[], // Use default supported types
    pathStructure: '{user_id}/receipts/{timestamp}_{filename}'
  }
} as const;

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  originalSize: number;
  compressionRatio: number;
}

interface UseFileUploadOptions {
  // Context configuration
  context?: UploadContext;
  
  // Generic file limits (will be overridden by context config)
  maxFiles?: number;
  maxSizeBytes?: number;
  
  // Callbacks
  onProgress?: (progress: UploadProgress[]) => void;
  onComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  
  // Context-specific identifiers
  workOrderId?: string;
  reportId?: string;
  invoiceId?: string;
  profileId?: string; // for avatar uploads
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const {
    context = 'workOrder', // Default to workOrder for backward compatibility
    maxFiles,
    maxSizeBytes,
    onProgress,
    onComplete,
    onError,
    workOrderId: defaultWorkOrderId,
    reportId: defaultReportId,
    invoiceId: defaultInvoiceId,
    profileId
  } = options;
  
  // Get context-specific configuration
  const config = uploadConfigs[context];
  
  // Use context configuration or provided values
  const effectiveMaxFiles = maxFiles ?? 10;
  const effectiveMaxSize = maxSizeBytes ?? config.maxSize;

  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Generate context-aware file path
  const generateFilePath = useCallback((
    fileName: string,
    contextIds: { workOrderId?: string; reportId?: string; invoiceId?: string; profileId?: string }
  ): string => {
    if (!user) throw new Error("User not authenticated");
    
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Generate path based on context
    switch (context) {
      case 'avatar':
        return `${user.id}/avatar.jpg`;
      case 'workOrder':
        return `work-orders/${contextIds.workOrderId || 'temp'}/${timestamp}_${sanitizedFileName}`;
      case 'invoice':
        return `work-orders/${contextIds.workOrderId}/invoices/${timestamp}_${sanitizedFileName}`;
      case 'report':
        return `work-orders/${contextIds.workOrderId}/reports/${timestamp}_${sanitizedFileName}`;
      case 'receipt':
        return `${user.id}/receipts/${timestamp}_${sanitizedFileName}`;
      default:
        // Fallback to legacy behavior
        const pathId = contextIds.workOrderId !== 'temp' ? contextIds.workOrderId : contextIds.reportId;
        return `${user.id}/${pathId}/${timestamp}_${sanitizedFileName}`;
    }
  }, [user, context]);

  // Update progress for a specific file
  const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const updated = prev.map(p => 
        p.fileId === fileId ? { ...p, ...updates } : p
      );
      onProgress?.(updated);
      return updated;
    });
  }, [onProgress]);

  // Context-aware avatar cropping function
  const cropImageToSquare = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate square crop dimensions
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;

        canvas.width = size;
        canvas.height = size;

        // Draw cropped image
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(croppedFile);
            } else {
              reject(new Error('Failed to crop image'));
            }
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Validate files before upload using context-specific rules
  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    // Check file count
    if (files.length > effectiveMaxFiles) {
      errors.push(`Maximum ${effectiveMaxFiles} files allowed`);
      return { valid: [], errors };
    }

    files.forEach(file => {
      // Context-specific file type validation
      const supportedTypes = config.supportedTypes.length > 0 
        ? config.supportedTypes 
        : null; // Use default validation from fileUtils
      
      if (supportedTypes && supportedTypes.length > 0 && !supportedTypes.includes(file.type as any)) {
        errors.push(`${file.name}: Unsupported file type for ${context}. Allowed: ${supportedTypes.join(', ')}`);
        return;
      } else if (!supportedTypes && !isSupportedFileType(file)) {
        errors.push(`${file.name}: Unsupported file type. Allowed: ${getSupportedFormatsText()}`);
        return;
      }

      // Check file size against context-specific limit
      if (file.size > effectiveMaxSize) {
        const maxMB = Math.round(effectiveMaxSize / 1024 / 1024);
        errors.push(`${file.name}: File size exceeds ${maxMB}MB limit`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [effectiveMaxFiles, effectiveMaxSize, config.supportedTypes, context]);

  // Context-aware upload single file
  const uploadFile = useCallback(async (
    file: File,
    contextIds: { workOrderId?: string; reportId?: string; invoiceId?: string; profileId?: string },
    fileId?: string
  ): Promise<UploadedFile> => {
    if (!user) throw new Error("User not authenticated");

    // Get current user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    let processedFile: File;
    let originalSize = file.size;
    let compressedSize = file.size;
    let compressionRatio = 1;

    // Context-specific file processing
    if (context === 'avatar') {
      // Avatar: crop to square then compress
      if (fileId) updateProgress(fileId, { status: 'compressing', progress: 0 });
      
      try {
        // First crop to square
        const croppedFile = await cropImageToSquare(file);
        
        // Then compress to 500x500
        const { file: compressedFile } = await compressImage(croppedFile, {
          maxWidth: 500,
          maxHeight: 500,
          quality: 0.8,
        });
        
        processedFile = compressedFile;
        originalSize = file.size;
        compressedSize = compressedFile.size;
        compressionRatio = originalSize / compressedSize;
      } catch (error) {
        throw new Error(`Avatar processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (context === 'invoice') {
      // Invoice: no compression, use as-is
      processedFile = file;
    } else if (isImageFile(file.name, file.type) && config.processing.compress) {
      // Other contexts: compress images if configured
      if (fileId) updateProgress(fileId, { status: 'compressing', progress: 0 });
      
      let compressionResult: CompressionResult;
      try {
        compressionResult = await compressImage(file, {
          maxSizeBytes: effectiveMaxSize,
          maxWidth: 1920,
          maxHeight: 1080
        });
        processedFile = compressionResult.file;
        originalSize = compressionResult.originalSize;
        compressedSize = compressionResult.compressedSize;
        compressionRatio = compressionResult.compressionRatio;
      } catch (error) {
        throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Documents or no compression - use as-is
      processedFile = file;
    }

    // Generate context-aware file path
    const filePath = generateFilePath(processedFile.name, contextIds);

    // Upload to appropriate bucket
    if (fileId) updateProgress(fileId, { status: 'uploading', progress: 50 });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: context === 'avatar' // Only allow upsert for avatar updates
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (fileId) updateProgress(fileId, { progress: 90 });

    // Context-specific database operations
    let result: UploadedFile;
    
    if (context === 'avatar') {
      // Avatar: update profile.avatar_url
      const { data: urlData } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(uploadData.path);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      if (updateProfile) {
        await updateProfile({ avatar_url: avatarUrl });
      }

      result = {
        id: profile.id, // Use profile ID for avatar
        fileName: processedFile.name,
        fileUrl: uploadData.path,
        fileSize: compressedSize,
        originalSize: originalSize,
        compressionRatio: compressionRatio
      };
    } else if (context === 'invoice') {
      // Invoice: save to invoice_attachments table
      const fileType = getFileTypeForStorage(file);
      
      const { data: attachment, error: attachmentError } = await supabase
        .from("invoice_attachments")
        .insert({
          invoice_id: contextIds.invoiceId!,
          file_name: processedFile.name,
          file_url: uploadData.path,
          file_type: fileType,
          file_size: compressedSize,
          uploaded_by: profile.id,
        })
        .select()
        .single();

      if (attachmentError) {
        await supabase.storage.from(config.bucket).remove([uploadData.path]);
        throw new Error(`Database save failed: ${attachmentError.message}`);
      }

      result = {
        id: attachment.id,
        fileName: processedFile.name,
        fileUrl: uploadData.path,
        fileSize: compressedSize,
        originalSize: originalSize,
        compressionRatio: compressionRatio
      };
    } else {
      // Work order/report: save to work_order_attachments table
      const fileType = getFileTypeForStorage(file);
      
      const insertData: any = {
        file_name: processedFile.name,
        file_url: uploadData.path,
        file_type: fileType,
        file_size: compressedSize,
        uploaded_by_user_id: profile.id,
      };

      // Set appropriate ID based on context
      if (contextIds.workOrderId) {
        insertData.work_order_id = contextIds.workOrderId;
      } else if (contextIds.reportId) {
        insertData.work_order_report_id = contextIds.reportId;
      } else {
        throw new Error("Either workOrderId or reportId must be provided for work order uploads");
      }

      const { data: attachment, error: attachmentError } = await supabase
        .from("work_order_attachments")
        .insert(insertData)
        .select()
        .single();

      if (attachmentError) {
        await supabase.storage.from(config.bucket).remove([uploadData.path]);
        throw new Error(`Database save failed: ${attachmentError.message}`);
      }

      result = {
        id: attachment.id,
        fileName: processedFile.name,
        fileUrl: uploadData.path,
        fileSize: compressedSize,
        originalSize: originalSize,
        compressionRatio: compressionRatio
      };
    }

    if (fileId) updateProgress(fileId, { status: 'completed', progress: 100 });
    return result;
  }, [user, context, config, effectiveMaxSize, generateFilePath, updateProgress, cropImageToSquare, updateProfile]);

  // Main upload function - context-aware version
  const uploadFiles = useCallback(async (
    files: File[],
    workOrderId?: string,
    reportId?: string
  ): Promise<UploadedFile[]> => {
    if (!user) {
      const error = "User not authenticated";
      onError?.(error);
      throw new Error(error);
    }

    // Validate files
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      const errorMessage = errors.join(', ');
      onError?.(errorMessage);
      toast({
        title: "Upload Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    }

    setIsUploading(true);
    
    // Initialize progress tracking
    const initialProgress: UploadProgress[] = valid.map((file, index) => ({
      fileId: `${Date.now()}_${index}`,
      fileName: file.name,
      progress: 0,
      status: 'pending'
    }));
    
    setUploadProgress(initialProgress);
    onProgress?.(initialProgress);

    try {
      const results: UploadedFile[] = [];
      
      // Prepare context IDs object
      const contextIds = {
        workOrderId: workOrderId || defaultWorkOrderId,
        reportId: reportId || defaultReportId,
        invoiceId: defaultInvoiceId,
        profileId: profileId
      };
      
      // Upload files sequentially to avoid overwhelming the system
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        const fileId = initialProgress[i].fileId;
        
        try {
          const result = await uploadFile(file, contextIds, fileId);
          results.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          if (fileId) {
            updateProgress(fileId, { 
              status: 'error', 
              error: errorMessage 
            });
          }
          
          toast({
            title: "Upload Failed",
            description: `${file.name}: ${errorMessage}`,
            variant: "destructive",
          });
        }
      }

      setUploadedFiles(prev => [...prev, ...results]);
      onComplete?.(results);
      
      if (results.length > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${results.length} file(s)`,
        });
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [user, validateFiles, uploadFile, updateProgress, onProgress, onComplete, onError, toast, defaultWorkOrderId, defaultReportId, defaultInvoiceId, profileId]);

  // Context-aware remove file function
  const removeFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      // Find the file in uploadedFiles
      const file = uploadedFiles.find(f => f.id === fileId);
      if (!file) throw new Error("File not found");

      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from(config.bucket)
        .remove([file.fileUrl]);

      if (storageError) {
        console.warn("Failed to remove file from storage:", storageError);
      }

      // Context-specific database removal
      if (context === 'avatar') {
        // Avatar: remove from profile
        if (updateProfile) {
          await updateProfile({ avatar_url: null });
        }
      } else if (context === 'invoice') {
        // Invoice: remove from invoice_attachments
        const { error: dbError } = await supabase
          .from("invoice_attachments")
          .delete()
          .eq("id", fileId);

        if (dbError) throw dbError;
      } else {
        // Work order/report: remove from work_order_attachments
        const { error: dbError } = await supabase
          .from("work_order_attachments")
          .delete()
          .eq("id", fileId);

        if (dbError) throw dbError;
      }

      // Update local state
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      
      toast({
        title: "File Removed",
        description: "File has been successfully removed",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Remove failed';
      toast({
        title: "Remove Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [uploadedFiles, toast, config.bucket, context, updateProfile]);

  // Reset upload state
  const reset = useCallback(() => {
    setUploadProgress([]);
    setUploadedFiles([]);
    setIsUploading(false);
  }, []);

  return {
    uploadFiles,
    removeFile,
    reset,
    uploadProgress,
    isUploading,
    uploadedFiles,
    validateFiles
  };
}
