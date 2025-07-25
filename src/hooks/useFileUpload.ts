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
} from "@/utils/fileTypeUtils";

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
  maxFiles?: number;
  maxSizeBytes?: number;
  onProgress?: (progress: UploadProgress[]) => void;
  onComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  // Context for attaching to work order or work order report
  workOrderId?: string;
  reportId?: string;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    maxFiles = 10,
    maxSizeBytes = 10 * 1024 * 1024, // 10MB
    onProgress,
    onComplete,
    onError,
    workOrderId: defaultWorkOrderId,
    reportId: defaultReportId
  } = options;

  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Generate file path structure: {user_id}/{work_order_id_or_report_id}/{timestamp}_{filename}
  const generateFilePath = useCallback((
    workOrderId: string,
    reportId: string,
    fileName: string
  ): string => {
    if (!user) throw new Error("User not authenticated");
    
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Use workOrderId for work order attachments, reportId for report attachments
    const pathId = workOrderId !== 'temp' ? workOrderId : reportId;
    return `${user.id}/${pathId}/${timestamp}_${sanitizedFileName}`;
  }, [user]);

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

  // Validate files before upload
  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    // Check file count
    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid: [], errors };
    }

    files.forEach(file => {
      // Check file type
      if (!isSupportedFileType(file)) {
        errors.push(`${file.name}: Unsupported file type. Allowed: ${getSupportedFormatsText()}`);
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        errors.push(`${file.name}: File size exceeds ${maxMB}MB limit`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [maxFiles, maxSizeBytes]);

  // Upload single file
  const uploadFile = useCallback(async (
    file: File,
    workOrderId?: string,
    reportId?: string,
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

    // Determine file type for storage
    const fileType = getFileTypeForStorage(file);
    
    let processedFile: File;
    let originalSize = file.size;
    let compressedSize = file.size;
    let compressionRatio = 1;

    // Only compress images, pass documents through directly
    if (isImageFile(file)) {
      if (fileId) updateProgress(fileId, { status: 'compressing', progress: 0 });
      
      let compressionResult: CompressionResult;
      try {
        compressionResult = await compressImage(file, {
          maxSizeBytes,
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
      // For documents, use the file as-is
      processedFile = file;
    }

    // Generate file path
    const filePath = generateFilePath(workOrderId || 'temp', reportId || 'temp', processedFile.name);

    // Upload to Supabase Storage
    if (fileId) updateProgress(fileId, { status: 'uploading', progress: 50 });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("work-order-attachments")
      .upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (fileId) updateProgress(fileId, { progress: 90 });

    // Save metadata to work_order_attachments table
    // Ensure exactly one of work_order_id or work_order_report_id is set
    const insertData: any = {
      file_name: processedFile.name,
      file_url: uploadData.path,
      file_type: fileType,
      file_size: compressedSize,
      uploaded_by_user_id: profile.id,
    };

    // Set either work_order_id OR work_order_report_id, never both
    if (workOrderId) {
      insertData.work_order_id = workOrderId;
    } else if (reportId) {
      insertData.work_order_report_id = reportId;
    } else {
      throw new Error("Either workOrderId or reportId must be provided");
    }

    const { data: attachment, error: attachmentError } = await supabase
      .from("work_order_attachments")
      .insert(insertData)
      .select()
      .single();

    if (attachmentError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from("work-order-attachments")
        .remove([uploadData.path]);
      
      throw new Error(`Database save failed: ${attachmentError.message}`);
    }

    if (fileId) updateProgress(fileId, { status: 'completed', progress: 100 });

    return {
      id: attachment.id,
      fileName: processedFile.name,
      fileUrl: uploadData.path,
      fileSize: compressedSize,
      originalSize: originalSize,
      compressionRatio: compressionRatio
    };
  }, [user, maxSizeBytes, generateFilePath, updateProgress]);

  // Main upload function - use provided IDs or fall back to defaults from options
  const uploadFiles = useCallback(async (
    files: File[],
    workOrderId?: string,
    reportId?: string
  ): Promise<UploadedFile[]> => {
    // Use provided IDs or fall back to defaults from options
    const effectiveWorkOrderId = workOrderId || defaultWorkOrderId;
    const effectiveReportId = reportId || defaultReportId;
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
      
      // Upload files sequentially to avoid overwhelming the system
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        const fileId = initialProgress[i].fileId;
        
        try {
          const result = await uploadFile(file, effectiveWorkOrderId, effectiveReportId, fileId);
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
  }, [user, validateFiles, uploadFile, updateProgress, onProgress, onComplete, onError, toast]);

  // Remove uploaded file
  const removeFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      // Find the file in uploadedFiles
      const file = uploadedFiles.find(f => f.id === fileId);
      if (!file) throw new Error("File not found");

      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from("work-order-attachments")
        .remove([file.fileUrl]);

      if (storageError) {
        console.warn("Failed to remove file from storage:", storageError);
      }

      // Remove from database
      const { error: dbError } = await supabase
        .from("work_order_attachments")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

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
  }, [uploadedFiles, toast]);

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