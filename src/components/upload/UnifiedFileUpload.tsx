import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalUploadSheet } from './UniversalUploadSheet';
import { FileDropzone } from './FileDropzone';
import { useFileValidation, getFileType, type ValidationError } from './FileValidation';
import { FilePreviewList } from './FilePreviewList';
import { FileRequirements } from './FileRequirements';
import { ValidationErrorList } from './ValidationErrorList';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// ============= FILE STATE MANAGEMENT =============
// Clear state ownership model:
// 1. 'selecting' - User is choosing files (component owns state)
// 2. 'staged' - Files selected but not yet confirmed for upload (component owns state)  
// 3. 'uploading' - Files confirmed and being uploaded (parent owns state)
// 4. 'completed'/'error' - Upload finished (parent owns state)

type FileStage = 'selecting' | 'staged' | 'uploading' | 'completed' | 'error';

interface StagedFile {
  file: File;
  id: string;
  previewUrl?: string;
  fileType: 'image' | 'document';
  stage: FileStage;
  uploadState: 'staged' | 'uploading' | 'completed' | 'error';
}

// Legacy interface for backward compatibility  
interface FilePreview {
  file: File;
  id: string;
  previewUrl?: string;
  fileType: 'image' | 'document';
}

// ValidationError now imported from FileValidation

interface UploadProgress {
  [fileName: string]: {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
  };
}

interface UnifiedFileUploadProps {
  /**
   * Upload mode controls the file handling behavior:
   * - 'immediate': Files are sent to parent immediately on selection (legacy behavior)
   * - 'staged': Files are held internally until explicit upload action (new behavior)
   * @default 'immediate' for backward compatibility
   */
  mode?: 'immediate' | 'staged';
  
  /**
   * How to handle multiple file selections:
   * - 'replace': New files replace all previous selections (default, predictable behavior)
   * - 'accumulate': New files add to existing selection
   * @default 'replace' for predictable behavior
   */
  selectionMode?: 'accumulate' | 'replace';
  
  /**
   * Legacy callback - called immediately when files are selected in 'immediate' mode
   * Not called in 'staged' mode. Always receives the FULL file list.
   */
  onFilesSelected?: (files: File[]) => void;
  
  /**
   * Called when files are selected and staged (only in 'staged' mode)
   * Use this to update UI to show selected files awaiting upload. Always receives the FULL file list.
   */
  onFilesStaged?: (files: File[]) => void;
  
  /**
   * Called when user explicitly requests upload (only in 'staged' mode)
   * This is when you should start the actual upload process. Always receives the FULL file list.
   */
  onUploadRequested?: (files: File[]) => void;
  
  maxFiles?: number;
  maxSizeBytes?: number;
  uploadProgress?: UploadProgress;
  disabled?: boolean;
  className?: string;
  acceptedTypes?: string[];
  isUploading?: boolean;
}

export function UnifiedFileUpload({
  mode = 'immediate', // Default to immediate for backward compatibility
  selectionMode = 'replace', // Default to replace for predictable behavior
  onFilesSelected,
  onFilesStaged,
  onUploadRequested,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  uploadProgress = {},
  disabled = false,
  className,
  acceptedTypes = [],
  isUploading = false
}: UnifiedFileUploadProps) {
  const isMobile = useIsMobile();
  
  // ============= STAGED FILE STATE =============
  // Component owns file state until explicit confirmation
  // Clear separation between 'staged' and 'uploading' states
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  // Track object URLs for proper cleanup
  const objectURLsRef = useRef<Set<string>>(new Set());
  
  // Legacy backward compatibility - convert stagedFiles to previews
  const previews: FilePreview[] = useMemo(() => {
    return stagedFiles.map(sf => ({
      file: sf.file,
      id: sf.id,
      previewUrl: sf.previewUrl,
      fileType: sf.fileType
    }));
  }, [stagedFiles]);

  // Use validation hook for file validation
  const fileValidation = useFileValidation({
    maxFiles,
    maxSizeBytes,
    acceptedTypes,
    selectionMode,
    files: stagedFiles.map(sf => sf.file)
  });

  // ============= DUAL MODE FILE MANAGEMENT =============
  // Support both immediate and staged modes for backward compatibility
  const handleFilesSelected = useCallback((newFiles: File[]) => {
    console.log(`[UnifiedFileUpload] Files selected in ${mode} mode, ${selectionMode} selection:`, newFiles.length);
    
    // Get existing files for validation and accumulation logic
    const existingFiles = mode === 'staged' ? stagedFiles.map(sf => sf.file) : [];
    const { valid, errors } = fileValidation.validateFiles(newFiles, existingFiles);
    
    // Update validation errors
    setValidationErrors(errors);
    
    if (valid.length > 0) {
      if (mode === 'immediate') {
        // Legacy immediate mode: call onFilesSelected with full file list
        console.log(`[UnifiedFileUpload] Immediate mode - calling onFilesSelected with full list`);
        const allFiles = selectionMode === 'accumulate' ? [...existingFiles, ...valid] : valid;
        onFilesSelected?.(allFiles);
      } else {
        // Staged mode: update internal state and call onFilesStaged with full file list
        console.log(`[UnifiedFileUpload] Staged mode - updating internal state`);
        
        const newStagedFiles: StagedFile[] = valid.map(file => {
          const id = `${Date.now()}_${Math.random()}`;
          const fileType = getFileType(file);
          
          let previewUrl: string | undefined;
          if (fileType === 'image') {
            previewUrl = URL.createObjectURL(file);
            objectURLsRef.current.add(previewUrl);
          }
          
          return {
            file,
            id,
            fileType,
            previewUrl,
            stage: 'staged' as FileStage,
            uploadState: 'staged' as const
          };
        });

        setStagedFiles(prev => {
          // Apply selection mode logic
          const updated = selectionMode === 'accumulate' ? [...prev, ...newStagedFiles] : [...newStagedFiles];
          console.log(`[UnifiedFileUpload] ${selectionMode} mode - Total staged: ${updated.length}`);
          
          // Clean up old object URLs if replacing
          if (selectionMode === 'replace') {
            prev.forEach(stagedFile => {
              if (stagedFile.previewUrl) {
                URL.revokeObjectURL(stagedFile.previewUrl);
                objectURLsRef.current.delete(stagedFile.previewUrl);
              }
            });
          }
          
          // Notify parent with full file list
          const allFiles = updated.map(sf => sf.file);
          onFilesStaged?.(allFiles);
          
          return updated;
        });
      }
    }
  }, [mode, selectionMode, fileValidation.validateFiles, stagedFiles, onFilesSelected, onFilesStaged]);

  const removeFile = useCallback((id: string) => {
    console.log(`[UnifiedFileUpload] Removing staged file with id: ${id}`);
    
    setStagedFiles(prev => {
      const fileToRemove = prev.find(sf => sf.id === id);
      
      // Don't allow removing files that are currently uploading
      if (fileToRemove?.uploadState === 'uploading') {
        console.log(`[UnifiedFileUpload] Cannot remove file currently uploading: ${fileToRemove.file.name}`);
        return prev;
      }
      
      const updated = prev.filter(sf => sf.id !== id);
      
      // Clean up object URL to prevent memory leaks
      if (fileToRemove?.previewUrl) {
        console.log(`[UnifiedFileUpload] Revoking object URL for: ${fileToRemove.file.name}`);
        URL.revokeObjectURL(fileToRemove.previewUrl);
        objectURLsRef.current.delete(fileToRemove.previewUrl);
      }
      
      // Auto-clear related validation errors when file is removed
      if (fileToRemove) {
        setValidationErrors(currentErrors => {
          const filteredErrors = currentErrors.filter(error => 
            error.fileName !== fileToRemove.file.name
          );
          
          // Clear max files error if we're now under the limit
          const newCount = updated.length;
          if (newCount < maxFiles) {
            return filteredErrors.filter(error => error.type !== 'maxFiles');
          }
          
          return filteredErrors;
        });
      }
      
      console.log(`[UnifiedFileUpload] Removed staged file: ${fileToRemove?.file.name || id}. Remaining: ${updated.length}`);
      return updated;
    });
  }, [maxFiles]);

  const clearAll = useCallback(() => {
    console.log(`[UnifiedFileUpload] Clearing all ${stagedFiles.length} staged files`);
    
    // Clean up all object URLs to prevent memory leaks
    stagedFiles.forEach(stagedFile => {
      if (stagedFile.previewUrl) {
        console.log(`[UnifiedFileUpload] Revoking object URL for: ${stagedFile.file.name}`);
        URL.revokeObjectURL(stagedFile.previewUrl);
        objectURLsRef.current.delete(stagedFile.previewUrl);
      }
    });
    
    setStagedFiles([]);
    setValidationErrors([]);
    console.log(`[UnifiedFileUpload] All staged files cleared`);
  }, [stagedFiles]);

  const dismissError = useCallback((errorId: string) => {
    setValidationErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName] || { progress: 0, status: 'pending' as const };
  };

  // Sync uploadProgress prop with internal file states
  useEffect(() => {
    if (mode === 'staged' && Object.keys(uploadProgress).length > 0) {
      setStagedFiles(prev => {
        return prev.map(file => {
          const progress = uploadProgress[file.file.name];
          if (progress) {
            let newUploadState: 'staged' | 'uploading' | 'completed' | 'error';
            switch (progress.status) {
              case 'uploading':
                newUploadState = 'uploading';
                break;
              case 'completed':
                newUploadState = 'completed';
                break;
              case 'error':
                newUploadState = 'error';
                break;
              default:
                newUploadState = file.uploadState; // Keep current state
            }
            return { ...file, uploadState: newUploadState };
          }
          return file;
        });
      });
    }
  }, [uploadProgress, mode]);

  // Cleanup all object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      console.log(`[UnifiedFileUpload] Component unmounting, cleaning up ${objectURLsRef.current.size} object URLs`);
      objectURLsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      objectURLsRef.current.clear();
    };
  }, []);

  // Auto-clearing is now handled by the fileValidation hook


  // Calculate upload status for aria announcements
  const uploadStatusAnnouncement = useMemo(() => {
    const uploadingCount = previews.filter(p => getFileProgress(p.file.name).status === 'uploading').length;
    const errorCount = previews.filter(p => getFileProgress(p.file.name).status === 'error').length;
    const completedCount = previews.filter(p => getFileProgress(p.file.name).status === 'completed').length;
    
    if (uploadingCount > 0) return `Uploading ${uploadingCount} of ${previews.length} files`;
    if (errorCount > 0) return `${errorCount} files failed to upload`;
    if (completedCount === previews.length && previews.length > 0) return `All ${completedCount} files uploaded successfully`;
    return '';
  }, [previews, uploadProgress]);

  const fileRestrictions = fileValidation.getFileRestrictions();

  // Mobile UI
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)} role="region" aria-label="File upload">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {uploadStatusAnnouncement}
        </div>

        <FileRequirements
          {...fileRestrictions}
          mode={mode}
          selectionMode={selectionMode}
          currentFileCount={previews.length}
          layout="mobile"
        />

        <UniversalUploadSheet
          trigger={
            <Button
              variant="outline"
              className="w-full h-20 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-all duration-200"
              disabled={disabled || isUploading}
              aria-label={isUploading ? "Processing files, please wait" : `Upload files. Maximum ${maxFiles} files allowed.`}
            >
              <div className="text-center space-y-2">
                {isUploading ? (
                  <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isUploading ? "Processing Files..." : "Choose Files"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isUploading ? "Please wait..." : "Tap to browse"}
                  </p>
                </div>
              </div>
            </Button>
          }
          onFilesSelected={handleFilesSelected}
          accept={acceptedTypes.length > 0 ? acceptedTypes.join(',') : "*/*"}
          multiple={maxFiles > 1}
          disabled={disabled || isUploading}
          isProcessing={isUploading}
        />

        <ValidationErrorList errors={validationErrors} onDismissError={dismissError} />

        <FilePreviewList
          files={stagedFiles}
          onRemove={removeFile}
          onClear={clearAll}
          uploadProgress={uploadProgress}
          layout="mobile"
          mode={mode}
          onUploadRequested={onUploadRequested}
          isUploading={isUploading}
          disabled={disabled}
        />
      </div>
    );
  }

  // Desktop UI with drag-and-drop
  return (
    <div className={cn("space-y-4", className)} role="region" aria-label="File upload">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {uploadStatusAnnouncement}
      </div>

      <FileRequirements
        {...fileRestrictions}
        mode={mode}
        selectionMode={selectionMode}
        currentFileCount={previews.length}
        layout="desktop"
      />

      <FileDropzone
        onFilesSelected={handleFilesSelected}
        disabled={disabled}
        acceptedTypes={acceptedTypes}
        maxFiles={maxFiles}
        maxSizeBytes={maxSizeBytes}
        isUploading={isUploading}
        uploadStatusText={uploadStatusAnnouncement || "Processing files..."}
      />

      <ValidationErrorList errors={validationErrors} onDismissError={dismissError} />

      <FilePreviewList
        files={stagedFiles}
        onRemove={removeFile}
        onClear={clearAll}
        uploadProgress={uploadProgress}
        layout="desktop"
        mode={mode}
        onUploadRequested={onUploadRequested}
        isUploading={isUploading}
        disabled={disabled}
      />
    </div>
  );
}