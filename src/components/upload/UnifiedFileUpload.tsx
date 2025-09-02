import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Upload, X, File, ImageIcon, AlertCircle, Loader2, Info, FileText, Image as ImageIconSolid, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UniversalUploadSheet } from './UniversalUploadSheet';
import { FileDropzone } from './FileDropzone';
import { useFileValidation, getFileType, type ValidationError } from './FileValidation';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { getSupportedFormatsText } from '@/utils/fileUtils';

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
  const getUploadStatusAnnouncement = () => {
    const uploadingFiles = previews.filter(p => getFileProgress(p.file.name).status === 'uploading');
    const completedFiles = previews.filter(p => getFileProgress(p.file.name).status === 'completed');
    const errorFiles = previews.filter(p => getFileProgress(p.file.name).status === 'error');
    
    if (uploadingFiles.length > 0) {
      return `Uploading ${uploadingFiles.length} of ${previews.length} files`;
    }
    if (errorFiles.length > 0) {
      return `${errorFiles.length} files failed to upload`;
    }
    if (completedFiles.length === previews.length && previews.length > 0) {
      return `All ${completedFiles.length} files uploaded successfully`;
    }
    return '';
  };

  // Mobile UI
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)} role="region" aria-label="File upload">
        {/* Live region for status announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {getUploadStatusAnnouncement()}
        </div>

        {/* File restrictions and selection mode */}
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 border">
            <div className="space-y-2">
              <p className="font-medium text-foreground">Upload Requirements</p>
              <div className="grid grid-cols-1 gap-2">
                <span>Formats: {fileValidation.getFileRestrictions().types}</span>
                <span>Max size: {fileValidation.getFileRestrictions().size} per file</span>
                <span>Max files: {fileValidation.getFileRestrictions().count}</span>
              {mode === 'staged' && previews.length > 0 && (
                <span className="text-primary font-medium">
                  {selectionMode === 'accumulate' 
                    ? `Adding to ${previews.length} existing files` 
                    : 'New selection will replace existing files'
                  }
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Upload trigger */}
        <UniversalUploadSheet
          trigger={
            <Button
              variant="outline"
              className="w-full h-20 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-all duration-200"
              disabled={disabled || isUploading}
              aria-label={isUploading ? "Processing files, please wait" : `Upload files. Maximum ${maxFiles} files allowed.`}
              aria-describedby="upload-instructions"
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
                  <p id="upload-instructions" className="text-xs text-muted-foreground">
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

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="space-y-2" role="region" aria-live="assertive" aria-label="Upload errors">
            {validationErrors.map((error) => (
              <Alert key={error.id} variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="flex items-start justify-between space-x-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{error.message}</p>
                    <p className="text-xs opacity-90">{error.guidance}</p>
                  </div>
                  {error.isDismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissError(error.id)}
                      className="h-6 w-6 p-0 text-destructive-foreground hover:bg-destructive/20"
                      aria-label={`Dismiss error for ${error.fileName || 'upload'}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* File previews */}
        {previews.length > 0 && (
          <div className="space-y-2" role="region" aria-label="Selected files" aria-describedby="file-count">
            <div className="flex justify-between items-center">
              <p id="file-count" className="text-sm font-medium">Selected Files ({previews.length})</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 min-w-[44px]"
                aria-label={`Clear all ${previews.length} selected files`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4" role="list" aria-label="File list">
              {previews.map((preview) => {
                const progress = getFileProgress(preview.file.name);
                const progressId = `progress-${preview.id}`;
                return (
                  <Card key={preview.id} role="listitem" className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* File preview */}
                        <div role="img" aria-label={`${preview.fileType} file preview`}>
                          {preview.fileType === 'image' && preview.previewUrl ? (
                            <img
                              src={preview.previewUrl}
                              alt={`Preview of ${preview.file.name}`}
                              className="w-full h-48 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                              <FileText className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* File info and actions */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={preview.file.name}>
                                {preview.file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            {(() => {
                              const stagedFile = stagedFiles.find(sf => sf.id === preview.id);
                              const uploadState = stagedFile?.uploadState || 'staged';
                              const isUploading = uploadState === 'uploading';
                              
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(preview.id)}
                                  disabled={isUploading}
                                  className={cn(
                                    "h-11 w-11 p-0 flex-shrink-0",
                                    isUploading 
                                      ? "text-muted-foreground cursor-not-allowed" 
                                      : "text-destructive hover:text-destructive hover:bg-destructive/10"
                                  )}
                                  aria-label={isUploading ? `Cannot remove ${preview.file.name} while uploading` : `Remove ${preview.file.name}`}
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              );
                            })()}
                          </div>

                          {/* Progress and upload state */}
                          {(() => {
                            const stagedFile = stagedFiles.find(sf => sf.id === preview.id);
                            const uploadState = stagedFile?.uploadState || 'staged';
                            
                            // Only show progress for files actively being uploaded or completed/error
                            if (uploadState === 'staged') return null;
                            
                            return (
                              <div className="space-y-2" aria-describedby={progressId}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className={cn(
                                    "font-medium",
                                    uploadState === 'uploading' && "text-primary",
                                    uploadState === 'completed' && "text-emerald-600",
                                    uploadState === 'error' && "text-destructive"
                                  )} id={progressId}>
                                    {uploadState === 'uploading' && `Uploading...`}
                                    {uploadState === 'completed' && 'Upload complete'}
                                    {uploadState === 'error' && 'Upload failed'}
                                  </span>
                                  {uploadState === 'uploading' && (
                                    <span className="font-medium text-primary">{progress.progress}%</span>
                                  )}
                                </div>
                                {uploadState === 'uploading' && (
                                  <Progress 
                                    value={progress.progress} 
                                    className="h-2"
                                    aria-label={`Upload progress: ${progress.progress}%`}
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload trigger for staged mode */}
        {mode === 'staged' && previews.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button
                onClick={() => {
                  const allFiles = stagedFiles.map(sf => sf.file);
                  onUploadRequested?.(allFiles);
                }}
                disabled={disabled || isUploading || previews.length === 0}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading {previews.length} file{previews.length === 1 ? '' : 's'}...
                  </>
                ) : (
                  `Upload ${previews.length} file${previews.length === 1 ? '' : 's'}`
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop UI with drag-and-drop
  return (
    <div className={cn("space-y-4", className)} role="region" aria-label="File upload">
      {/* Live region for status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {getUploadStatusAnnouncement()}
      </div>

      {/* File restrictions */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Upload Requirements</p>
              <div className="grid grid-cols-3 gap-4 text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>Formats: {fileValidation.getFileRestrictions().types}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ImageIconSolid className="w-4 h-4" aria-hidden="true" />
                  <span>Max size: {fileValidation.getFileRestrictions().size} per file</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Max files: {fileValidation.getFileRestrictions().count}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drag and drop zone */}
      <FileDropzone
        onFilesSelected={handleFilesSelected}
        disabled={disabled}
        acceptedTypes={acceptedTypes}
        maxFiles={maxFiles}
        maxSizeBytes={maxSizeBytes}
        isUploading={isUploading}
        uploadStatusText={getUploadStatusAnnouncement() || "Processing files..."}
      />

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-2" role="region" aria-live="assertive" aria-label="Upload errors">
          {validationErrors.map((error) => (
            <Alert key={error.id} variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription className="flex items-start justify-between space-x-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{error.message}</p>
                  <p className="text-xs opacity-90">{error.guidance}</p>
                </div>
                {error.isDismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissError(error.id)}
                    className="h-6 w-6 p-0 text-destructive-foreground hover:bg-destructive/20"
                    aria-label={`Dismiss error for ${error.fileName || 'upload'}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* File previews */}
      {previews.length > 0 && (
        <div className="space-y-4" role="region" aria-label="Selected files" aria-describedby="desktop-file-count">
          <div className="flex justify-between items-center">
            <h4 id="desktop-file-count" className="font-medium">Selected Files ({previews.length})</h4>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAll}
              aria-label={`Clear all ${previews.length} selected files`}
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="File grid">
            {previews.map((preview) => {
              const progress = getFileProgress(preview.file.name);
              const progressId = `desktop-progress-${preview.id}`;
              return (
                <Card key={preview.id} role="listitem">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* File preview */}
                      <div 
                        className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden"
                        role="img" 
                        aria-label={`${preview.fileType} file preview`}
                      >
                        {preview.fileType === 'image' && preview.previewUrl ? (
                          <img
                            src={preview.previewUrl}
                            alt={`Preview of ${preview.file.name}`}
                            className="w-full h-full object-cover"
                          />
                         ) : (
                           <File className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                         )}
                      </div>

                      {/* File details */}
                      <div>
                        <p className="font-medium text-sm truncate" title={preview.file.name}>
                          {preview.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground" aria-label={`File size: ${(preview.file.size / 1024 / 1024).toFixed(2)} megabytes`}>
                          {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                       {/* Progress and upload state */}
                       {(() => {
                         const stagedFile = stagedFiles.find(sf => sf.id === preview.id);
                         const uploadState = stagedFile?.uploadState || 'staged';
                         
                         // Only show progress for files actively being uploaded or completed/error
                         if (uploadState === 'staged') return null;
                         
                         return (
                           <div className="space-y-1" role="group" aria-labelledby={progressId}>
                             {uploadState === 'uploading' && (
                               <Progress 
                                 value={progress.progress} 
                                 className="h-3" 
                                 aria-label={`Upload progress for ${preview.file.name}: ${progress.progress}%`}
                               />
                             )}
                             <p id={progressId} className={cn(
                               "text-xs font-medium",
                               uploadState === 'uploading' && "text-primary",
                               uploadState === 'completed' && "text-emerald-600", 
                               uploadState === 'error' && "text-destructive"
                             )} aria-live="polite">
                               {uploadState === 'uploading' 
                                 ? `Uploading: ${progress.progress}%`
                                 : uploadState === 'completed'
                                 ? 'Upload complete'
                                 : uploadState === 'error'
                                 ? 'Upload failed'
                                 : 'Ready to upload'
                               }
                             </p>
                           </div>
                         );
                       })()}

                       {/* Remove button */}
                       {(() => {
                         const stagedFile = stagedFiles.find(sf => sf.id === preview.id);
                         const uploadState = stagedFile?.uploadState || 'staged';
                         const isUploading = uploadState === 'uploading';
                         
                         return (
                           <Button
                             variant="outline"
                             size="sm"
                             className="w-full"
                             onClick={() => removeFile(preview.id)}
                             disabled={isUploading}
                             aria-label={isUploading ? `Cannot remove ${preview.file.name} while uploading` : `Remove ${preview.file.name} from upload queue`}
                           >
                             <X className="w-4 h-4 mr-1" aria-hidden="true" />
                             {isUploading ? 'Uploading...' : 'Remove'}
                           </Button>
                         );
                       })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Upload trigger for staged mode */}
          {mode === 'staged' && (
            <Card>
              <CardContent className="p-4">
                <Button
                  onClick={() => {
                    const allFiles = stagedFiles.map(sf => sf.file);
                    onUploadRequested?.(allFiles);
                  }}
                  disabled={disabled || isUploading || previews.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading {previews.length} file{previews.length === 1 ? '' : 's'}...
                    </>
                  ) : (
                    `Upload ${previews.length} file${previews.length === 1 ? '' : 's'}`
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}