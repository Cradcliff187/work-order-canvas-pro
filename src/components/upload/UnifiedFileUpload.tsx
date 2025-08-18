import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, ImageIcon, AlertCircle, Loader2, Info, FileText, Image as ImageIconSolid } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UniversalUploadSheet } from './UniversalUploadSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { isSupportedFileType, getSupportedFormatsText } from '@/utils/fileUtils';

interface FilePreview {
  file: File;
  id: string;
  previewUrl?: string;
  fileType: 'image' | 'document';
}

interface ValidationError {
  id: string;
  type: 'fileSize' | 'fileType' | 'duplicate' | 'maxFiles';
  fileName?: string;
  message: string;
  guidance: string;
  isDismissible: boolean;
}

interface UploadProgress {
  [fileName: string]: {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
  };
}

interface UnifiedFileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  uploadProgress?: UploadProgress;
  disabled?: boolean;
  className?: string;
  acceptedTypes?: string[];
  isUploading?: boolean;
}

export function UnifiedFileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  uploadProgress = {},
  disabled = false,
  className,
  acceptedTypes = [],
  isUploading = false
}: UnifiedFileUploadProps) {
  const isMobile = useIsMobile();
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const getFileType = (file: File): 'image' | 'document' => {
    return file.type.startsWith('image/') ? 'image' : 'document';
  };

  const isValidFileType = (file: File): boolean => {
    if (acceptedTypes.length > 0) {
      return acceptedTypes.includes(file.type);
    }
    return isSupportedFileType(file);
  };

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];
    const valid: File[] = [];
    const currentCount = previews.length;

    // Check file count
    if (currentCount + files.length > maxFiles) {
      const remaining = maxFiles - currentCount;
      errors.push({
        id: `maxFiles_${Date.now()}`,
        type: 'maxFiles',
        message: `You can only upload ${remaining} more file${remaining === 1 ? '' : 's'}`,
        guidance: `You currently have ${currentCount} files selected out of ${maxFiles} maximum.`,
        isDismissible: true
      });
      return { valid: [], errors };
    }

    files.forEach(file => {
      // Check file type
      if (!isValidFileType(file)) {
        const allowedFormats = acceptedTypes.length > 0 
          ? acceptedTypes.map(type => type.split('/')[1]?.toUpperCase()).join(', ')
          : 'JPEG, PNG, PDF, Word documents';
        errors.push({
          id: `fileType_${file.name}_${Date.now()}`,
          type: 'fileType',
          fileName: file.name,
          message: `${file.name} isn't supported`,
          guidance: `Try uploading ${allowedFormats} files instead.`,
          isDismissible: true
        });
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        const fileMB = (file.size / 1024 / 1024).toFixed(1);
        errors.push({
          id: `fileSize_${file.name}_${Date.now()}`,
          type: 'fileSize',
          fileName: file.name,
          message: `${file.name} (${fileMB}MB) exceeds the ${maxMB}MB limit`,
          guidance: 'Please compress the file and try again.',
          isDismissible: true
        });
        return;
      }

      // Check for duplicates
      const isDuplicate = previews.some(p => 
        p.file.name === file.name && p.file.size === file.size
      );
      if (isDuplicate) {
        errors.push({
          id: `duplicate_${file.name}_${Date.now()}`,
          type: 'duplicate',
          fileName: file.name,
          message: `${file.name} is already selected`,
          guidance: 'Choose a different file or rename it.',
          isDismissible: true
        });
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [previews, maxFiles, maxSizeBytes, acceptedTypes]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const { valid, errors } = validateFiles(newFiles);
    
    setValidationErrors(errors);
    
    if (valid.length > 0) {
      const newPreviews: FilePreview[] = valid.map(file => {
        const id = `${Date.now()}_${Math.random()}`;
        const fileType = getFileType(file);
        
        return {
          file,
          id,
          fileType,
          previewUrl: fileType === 'image' ? URL.createObjectURL(file) : undefined
        };
      });

      setPreviews(prev => [...prev, ...newPreviews]);
      onFilesSelected(valid);
    }
  }, [validateFiles, onFilesSelected]);

  const removeFile = useCallback((id: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== id);
      const fileToRemove = prev.find(p => p.id === id);
      
      // Revoke object URL to prevent memory leaks
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      
      // Auto-clear related validation errors
      if (fileToRemove) {
        setValidationErrors(currentErrors => 
          currentErrors.filter(error => 
            error.fileName !== fileToRemove.file.name
          )
        );
        
        // Clear max files error if we're now under the limit
        const newCount = updated.length;
        if (newCount < maxFiles) {
          setValidationErrors(currentErrors => 
            currentErrors.filter(error => error.type !== 'maxFiles')
          );
        }
      }
      
      // Update parent with remaining files
      onFilesSelected(updated.map(p => p.file));
      return updated;
    });
  }, [maxFiles, onFilesSelected]);

  const clearAll = useCallback(() => {
    // Revoke all object URLs
    previews.forEach(preview => {
      if (preview.previewUrl) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    });
    
    setPreviews([]);
    setValidationErrors([]);
    onFilesSelected([]);
  }, [previews, onFilesSelected]);

  const dismissError = useCallback((errorId: string) => {
    setValidationErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const getFileRestrictions = () => {
    const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
    const supportedTypes = acceptedTypes.length > 0 
      ? acceptedTypes.map(type => {
          if (type.includes('image')) return 'Images';
          if (type.includes('pdf')) return 'PDFs'; 
          if (type.includes('word') || type.includes('document')) return 'Word docs';
          if (type.includes('sheet') || type.includes('excel')) return 'Excel files';
          return type.split('/')[1]?.toUpperCase();
        }).filter(Boolean).join(', ')
      : 'Images, PDFs, Word docs, Excel files';
    
    return {
      types: supportedTypes,
      size: `${maxMB}MB`,
      count: maxFiles
    };
  };

  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName] || { progress: 0, status: 'pending' as const };
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    };
  }, []);

  // Desktop drag-and-drop setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesSelected,
    disabled: disabled || isMobile,
    accept: acceptedTypes.length > 0 ? Object.fromEntries(acceptedTypes.map(type => [type, []])) : undefined,
    multiple: maxFiles > 1
  });

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

        {/* File restrictions */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Upload Requirements</p>
                <div className="grid grid-cols-1 gap-2 text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    <span>Formats: {getFileRestrictions().types}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ImageIconSolid className="w-4 h-4" aria-hidden="true" />
                    <span>Max size: {getFileRestrictions().size} per file</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span>Max files: {getFileRestrictions().count}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload trigger */}
        <UniversalUploadSheet
          trigger={
            <Button
              variant="outline"
              className="w-full h-32 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50"
              disabled={disabled || isUploading}
              aria-label={isUploading ? "Processing files, please wait" : `Upload files. Maximum ${maxFiles} files allowed.`}
              aria-describedby="upload-instructions"
            >
              <div className="text-center space-y-2">
                {isUploading ? (
                  <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isUploading ? "Processing Files..." : "Upload Files"}
                  </p>
                  <p id="upload-instructions" className="text-xs text-muted-foreground">
                    {isUploading ? "Please wait..." : "Tap to choose files"}
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
                variant="ghost" 
                size="sm" 
                onClick={clearAll}
                aria-label={`Clear all ${previews.length} selected files`}
              >
                Clear All
              </Button>
            </div>
            
            <div className="space-y-2" role="list" aria-label="File list">
              {previews.map((preview) => {
                const progress = getFileProgress(preview.file.name);
                const progressId = `progress-${preview.id}`;
                return (
                  <Card key={preview.id} role="listitem">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        {/* File icon/preview */}
                        <div className="flex-shrink-0" role="img" aria-label={`${preview.fileType} file preview`}>
                          {preview.fileType === 'image' && preview.previewUrl ? (
                             <img
                               src={preview.previewUrl}
                               alt={`Preview of ${preview.file.name}`}
                               className="w-20 h-20 object-cover rounded border"
                             />
                          ) : (
                             <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                               <File className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                             </div>
                          )}
                        </div>

                        {/* File details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={preview.file.name}>{preview.file.name}</p>
                          <p className="text-xs text-muted-foreground" aria-label={`File size: ${(preview.file.size / 1024 / 1024).toFixed(2)} megabytes`}>
                            {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          
                          {/* Progress */}
                          {progress.status !== 'pending' && (
                             <div className="mt-1" role="group" aria-labelledby={progressId}>
                               <Progress 
                                 value={progress.progress} 
                                 className="h-2" 
                                 aria-label={`Upload progress for ${preview.file.name}: ${progress.progress}%`}
                               />
                               <p id={progressId} className="text-xs text-muted-foreground mt-1" aria-live="polite">
                                 {progress.status === 'uploading' 
                                   ? `Uploading ${preview.file.name}: ${progress.progress}%`
                                   : progress.status === 'completed'
                                   ? `${preview.file.name} uploaded successfully`
                                   : progress.status === 'error'
                                   ? `Error uploading ${preview.file.name}`
                                   : `${preview.file.name} pending upload`
                                 }
                               </p>
                             </div>
                          )}
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(preview.id)}
                          disabled={progress.status === 'uploading'}
                          aria-label={`Remove ${preview.file.name} from upload queue`}
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
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
                  <span>Formats: {getFileRestrictions().types}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ImageIconSolid className="w-4 h-4" aria-hidden="true" />
                  <span>Max size: {getFileRestrictions().size} per file</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Max files: {getFileRestrictions().count}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drag and drop zone */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={isDragActive ? "Drop files to upload" : `Click to upload files or drag and drop. Maximum ${maxFiles} files allowed, ${Math.round(maxSizeBytes / 1024 / 1024)}MB each.`}
        aria-describedby="upload-zone-instructions"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }
        }}
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} aria-hidden="true" />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium mb-2">
            {isDragActive ? "Drop files here" : "Drag & drop files here"}
          </h3>
          <p id="upload-zone-instructions" className="text-muted-foreground mb-4">
            or click to browse files
          </p>
          <Button 
            variant="outline" 
            type="button" 
            disabled={disabled || isUploading}
            aria-label={isUploading ? "Processing files, please wait" : "Browse and select files to upload"}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                {getUploadStatusAnnouncement() || "Processing files..."}
              </>
            ) : (
              "Browse Files"
            )}
          </Button>
        </CardContent>
      </Card>

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

                      {/* Progress */}
                      {progress.status !== 'pending' && (
                         <div className="space-y-1" role="group" aria-labelledby={progressId}>
                           <Progress 
                             value={progress.progress} 
                             className="h-3" 
                             aria-label={`Upload progress for ${preview.file.name}: ${progress.progress}%`}
                           />
                           <p id={progressId} className="text-xs text-muted-foreground" aria-live="polite">
                             {progress.status === 'uploading' 
                               ? `Uploading ${preview.file.name}: ${progress.progress}%`
                               : progress.status === 'completed'
                               ? `${preview.file.name} uploaded successfully`
                               : progress.status === 'error'
                               ? `Error uploading ${preview.file.name}`
                               : `${preview.file.name} pending upload`
                             }
                           </p>
                         </div>
                      )}

                      {/* Remove button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => removeFile(preview.id)}
                        disabled={progress.status === 'uploading'}
                        aria-label={`Remove ${preview.file.name} from upload queue`}
                      >
                        <X className="w-4 h-4 mr-1" aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}