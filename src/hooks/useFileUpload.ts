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
    pathStructure: 'invoices/{invoice_id}/{work_order_id}/{timestamp}_{filename}'
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
  invoiceId?: string; // for invoice uploads
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
        // Store by invoice and work order for clear grouping
        return `invoices/${contextIds.invoiceId}/${contextIds.workOrderId || 'unassigned'}/${timestamp}_${sanitizedFileName}`;
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
    fileId?: string,
    isInternal: boolean = false
  ): Promise<UploadedFile> => {
    if (!user) throw new Error("User not authenticated");

    // Get current user profile
    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // ADD DEBUG LOGGING
    console.log('[FileUpload Debug] User ID:', user.id);
    console.log('[FileUpload Debug] Profile fetch result:', { profile, profileFetchError });

    if (!profile) {
      console.error('[FileUpload Debug] Profile not found!', { userId: user.id, error: profileFetchError });
      throw new Error("Profile not found");
    }

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
      // Require invoiceId and workOrderId per Option A
      if (!contextIds.invoiceId) {
        await supabase.storage.from(config.bucket).remove([uploadData.path]);
        throw new Error("Missing invoiceId for invoice attachment upload");
      }
      if (!contextIds.workOrderId) {
        await supabase.storage.from(config.bucket).remove([uploadData.path]);
        throw new Error("Missing workOrderId for invoice attachment upload");
      }

      const fileType = getFileTypeForStorage(file);
      
      const { data: attachment, error: attachmentError } = await supabase
        .from("invoice_attachments")
        .insert({
          invoice_id: contextIds.invoiceId!,
          work_order_id: contextIds.workOrderId!,
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
        is_internal: isInternal,
      };

      // ADD DEBUG LOGGING
      console.log('[FileUpload Debug] Insert data being sent:', insertData);
      console.log('[FileUpload Debug] Profile ID being used:', profile.id);
      console.log('[FileUpload Debug] Work Order ID:', contextIds.workOrderId);

      // Set appropriate ID based on context
      if (contextIds.workOrderId) {
        insertData.work_order_id = contextIds.workOrderId;
      } else if (contextIds.reportId) {
        insertData.work_order_report_id = contextIds.reportId;
      } else {
        throw new Error("Either workOrderId or reportId must be provided for work order uploads");
      }

      console.log('[FileUpload Debug] Final insert data:', insertData);

      const { data: attachment, error: attachmentError } = await supabase
        .from("work_order_attachments")
        .insert(insertData)
        .select()
        .single();

      // ADD DEBUG LOGGING
      console.log('[FileUpload Debug] Insert result:', { attachment, attachmentError });

      if (attachmentError) {
        console.error('[FileUpload Debug] Insert failed:', attachmentError);
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
    isInternal: boolean = false,
    workOrderId?: string,
    reportId?: string,
    invoiceIdOverride?: string
  ): Promise<UploadedFile[]> => {
    if (!user) {
      const error = "User not authenticated";
      onError?.(error);
      throw new Error(error);
    }

    // Get current profile
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (profileError || !currentProfile) {
      throw new Error("Failed to get user profile");
    }

    // Check user organizations and work order access if workOrderId provided
    if (workOrderId) {
      // Get user organizations with organization details
      const { data: userOrgs, error: orgError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations!organization_id(
            organization_type
          )
        `)
        .eq('user_id', currentProfile.id);
      
      if (orgError) {
        console.error('Failed to get user organizations:', orgError);
        throw new Error('Failed to get user organizations');
      }

      // Get work order details with assignment info
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select('id, organization_id, assigned_organization_id')
        .eq('id', workOrderId)
        .single();
      
      if (woError || !workOrder) {
        console.error('Work order not found:', woError);
        throw new Error('Work order not found');
      }

      // Check access based on user role and organization type
      let hasAccess = false;
      
      // Check if user is admin (internal user with admin role)
      const isAdmin = userOrgs?.some(uo => 
        uo.organizations?.organization_type === 'internal' && 
        uo.role === 'admin'
      );
      
      if (isAdmin) {
        console.log('Access granted: User is admin');
        hasAccess = true;
      } else {
        // Check partner access (work order belongs to partner organization)
        const partnerOrgIds = userOrgs
          ?.filter(uo => uo.organizations?.organization_type === 'partner')
          ?.map(uo => uo.organization_id) || [];
        
        if (partnerOrgIds.includes(workOrder.organization_id)) {
          console.log('Access granted: Partner owns work order');
          hasAccess = true;
        }
        
        // Check subcontractor access (work order assigned to subcontractor organization)
        if (!hasAccess && workOrder.assigned_organization_id) {
          const subcontractorOrgIds = userOrgs
            ?.filter(uo => uo.organizations?.organization_type === 'subcontractor')
            ?.map(uo => uo.organization_id) || [];
          
          if (subcontractorOrgIds.includes(workOrder.assigned_organization_id)) {
            console.log('Access granted: Subcontractor assigned to work order');
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        console.error('Access denied for upload:', {
          workOrderId,
          workOrderOrgId: workOrder.organization_id,
          assignedOrgId: workOrder.assigned_organization_id,
          userOrgs: userOrgs?.map(uo => ({
            orgId: uo.organization_id,
            type: uo.organizations?.organization_type,
            role: uo.role
          }))
        });
        throw new Error('Access denied: You do not have permission to upload files to this work order');
      }
    }

    // Validate files
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      const errorMessage = errors.join(', ');
      onError?.(errorMessage);
      toast({
        title: "File Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    }

    setIsUploading(true);
    
    // Show upload start notification
    toast({
      title: `Uploading ${valid.length} file${valid.length > 1 ? 's' : ''}...`,
      description: "Please wait while your files are uploaded.",
    });
    
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
        invoiceId: invoiceIdOverride || defaultInvoiceId,
        profileId: profileId
      };

      // Upload files sequentially to avoid overwhelming the system
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        const fileId = initialProgress[i].fileId;
        
        try {
          const result = await uploadFile(file, contextIds, fileId, isInternal);
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
            description: `Failed to upload ${file.name}: ${errorMessage}`,
            variant: "destructive",
          });
        }
      }

      setUploadedFiles(prev => [...prev, ...results]);
      onComplete?.(results);
      
      if (results.length > 0) {
        // Context-aware success message
        const getContextMessage = () => {
          switch (context) {
            case 'workOrder':
              return `${results.length} file${results.length > 1 ? 's' : ''} uploaded to work order`;
            case 'report':
              return `${results.length} file${results.length > 1 ? 's' : ''} attached to report`;
            case 'invoice':
              return `${results.length} file${results.length > 1 ? 's' : ''} uploaded to invoice`;
            case 'receipt':
              return `${results.length} receipt${results.length > 1 ? 's' : ''} uploaded successfully`;
            case 'avatar':
              return "Profile picture updated successfully";
            default:
              return `${results.length} file${results.length > 1 ? 's' : ''} uploaded successfully`;
          }
        };

        toast({
          title: "Upload Complete",
          description: getContextMessage(),
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
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // For work order/report attachments, get file info from database first
      let fileUrl: string | null = null;
      
      if (context === 'avatar') {
        // Avatar: remove from profile
        if (updateProfile) {
          await updateProfile({ avatar_url: null });
        }
      } else if (context === 'invoice') {
        // Get file URL before deletion for storage cleanup
        const { data: attachment } = await supabase
          .from("invoice_attachments")
          .select("file_url")
          .eq("id", fileId)
          .single();
        
        fileUrl = attachment?.file_url || null;

        // Invoice: remove from invoice_attachments
        const { error: dbError } = await supabase
          .from("invoice_attachments")
          .delete()
          .eq("id", fileId);

        if (dbError) throw dbError;
      } else {
        // Get file URL before deletion for storage cleanup
        const { data: attachment } = await supabase
          .from("work_order_attachments")
          .select("file_url")
          .eq("id", fileId)
          .single();
        
        fileUrl = attachment?.file_url || null;

        // Work order/report: remove from work_order_attachments
        const { error: dbError } = await supabase
          .from("work_order_attachments")
          .delete()
          .eq("id", fileId);

        if (dbError) {
          console.error("Database deletion error:", dbError);
          throw new Error(`Failed to delete attachment: ${dbError.message}`);
        }
      }

      // Remove from storage if we have a file URL
      if (fileUrl) {
        const { error: storageError } = await supabase.storage
          .from(config.bucket)
          .remove([fileUrl]);

        if (storageError) {
          console.warn("Failed to remove file from storage:", storageError);
          // Don't throw here since the database record is already deleted
        }
      }

      // Update local state (remove from uploadedFiles if it exists there)
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      
      toast({
        title: "File Removed",
        description: "File has been successfully removed",
      });
    } catch (error) {
      console.error("Remove file error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Remove failed';
      toast({
        title: "Remove Failed", 
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [user, uploadedFiles, toast, config.bucket, context, updateProfile]);

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
