import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface InvoiceUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface InvoiceUploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: 'document' | 'invoice' | 'photo';
}

// Supported file types for invoice attachments
const SUPPORTED_INVOICE_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'text/csv',
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
];

interface UseInvoiceFileUploadOptions {
  maxFiles?: number;
  maxSizeBytes?: number;
  onProgress?: (progress: InvoiceUploadProgress[]) => void;
  onComplete?: (files: InvoiceUploadedFile[]) => void;
  onError?: (error: string) => void;
}

export function useInvoiceFileUpload(options: UseInvoiceFileUploadOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    maxFiles = 5,
    maxSizeBytes = 10 * 1024 * 1024, // 10MB
    onProgress,
    onComplete,
    onError
  } = options;

  const [uploadProgress, setUploadProgress] = useState<InvoiceUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<InvoiceUploadedFile[]>([]);

  // Generate file path: {user_id}/invoices/{invoice_id}/{timestamp}_{filename}
  const generateFilePath = useCallback((
    invoiceId: string,
    fileName: string
  ): string => {
    if (!user) throw new Error("User not authenticated");
    
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${user.id}/invoices/${invoiceId}/${timestamp}_${sanitizedFileName}`;
  }, [user]);

  // Determine file type for storage
  const getFileTypeForStorage = useCallback((file: File): 'document' | 'invoice' | 'photo' => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type === 'application/pdf') return 'invoice';
    return 'document';
  }, []);

  // Update progress for a specific file
  const updateProgress = useCallback((fileId: string, updates: Partial<InvoiceUploadProgress>) => {
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
      if (!SUPPORTED_INVOICE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type. Allowed: PDF, images, Excel, CSV, Word documents`);
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
    invoiceId: string,
    fileId: string
  ): Promise<InvoiceUploadedFile> => {
    if (!user) throw new Error("User not authenticated");

    // Get current user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Generate file path
    const filePath = generateFilePath(invoiceId, file.name);
    const fileType = getFileTypeForStorage(file);

    // Upload to Supabase Storage
    updateProgress(fileId, { status: 'uploading', progress: 50 });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("work-order-attachments")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    updateProgress(fileId, { progress: 90 });

    // Save metadata to invoice_attachments table
    const { data: attachment, error: attachmentError } = await supabase
      .from("invoice_attachments")
      .insert({
        invoice_id: invoiceId,
        file_name: file.name,
        file_url: uploadData.path,
        file_type: fileType,
        file_size: file.size,
        uploaded_by: profile.id,
      })
      .select()
      .single();

    if (attachmentError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from("work-order-attachments")
        .remove([uploadData.path]);
      
      throw new Error(`Database save failed: ${attachmentError.message}`);
    }

    updateProgress(fileId, { status: 'completed', progress: 100 });

    return {
      id: attachment.id,
      fileName: file.name,
      fileUrl: uploadData.path,
      fileSize: file.size,
      fileType
    };
  }, [user, generateFilePath, getFileTypeForStorage, updateProgress]);

  // Main upload function
  const uploadInvoiceAttachments = useCallback(async (
    files: File[],
    invoiceId: string
  ): Promise<InvoiceUploadedFile[]> => {
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
      throw new Error(errorMessage);
    }

    setIsUploading(true);
    
    // Initialize progress tracking
    const initialProgress: InvoiceUploadProgress[] = valid.map((file, index) => ({
      fileId: `${Date.now()}_${index}`,
      fileName: file.name,
      progress: 0,
      status: 'pending'
    }));
    
    setUploadProgress(initialProgress);
    onProgress?.(initialProgress);

    try {
      const results: InvoiceUploadedFile[] = [];
      
      // Upload files sequentially to avoid overwhelming the system
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        const fileId = initialProgress[i].fileId;
        
        try {
          const result = await uploadFile(file, invoiceId, fileId);
          results.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          updateProgress(fileId, { 
            status: 'error', 
            error: errorMessage 
          });
          
          // For invoice attachments, we'll log the error but continue with other files
          console.warn(`Failed to upload ${file.name}:`, errorMessage);
        }
      }

      setUploadedFiles(prev => [...prev, ...results]);
      onComplete?.(results);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [user, validateFiles, uploadFile, updateProgress, onProgress, onComplete, onError]);

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
        .from("invoice_attachments")
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
    uploadInvoiceAttachments,
    removeFile,
    reset,
    uploadProgress,
    isUploading,
    uploadedFiles,
    validateFiles
  };
}