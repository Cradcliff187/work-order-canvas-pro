import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const getFileType = (file: File): 'image' | 'document' => {
    return file.type.startsWith('image/') ? 'image' : 'document';
  };

  const isValidFileType = (file: File): boolean => {
    if (acceptedTypes.length > 0) {
      return acceptedTypes.includes(file.type);
    }
    return isSupportedFileType(file);
  };

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];
    const currentCount = previews.length;

    // Check file count
    if (currentCount + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed (currently have ${currentCount})`);
      return { valid: [], errors };
    }

    files.forEach(file => {
      // Check file type
      if (!isValidFileType(file)) {
        const allowedTypes = acceptedTypes.length > 0 
          ? acceptedTypes.join(', ')
          : getSupportedFormatsText();
        errors.push(`${file.name}: Unsupported file type. Allowed: ${allowedTypes}`);
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        errors.push(`${file.name}: File size exceeds ${maxMB}MB limit`);
        return;
      }

      // Check for duplicates
      const isDuplicate = previews.some(p => 
        p.file.name === file.name && p.file.size === file.size
      );
      if (isDuplicate) {
        errors.push(`${file.name}: File already selected`);
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
      
      // Update parent with remaining files
      onFilesSelected(updated.map(p => p.file));
      return updated;
    });
    
    // Clear any errors when files are removed
    if (previews.length <= maxFiles) {
      setValidationErrors([]);
    }
  }, [previews.length, maxFiles, onFilesSelected]);

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

  // Mobile UI
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Upload trigger */}
        <UniversalUploadSheet
          trigger={
            <Button
              variant="outline"
              className="w-full h-32 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50"
              disabled={disabled || isUploading}
            >
              <div className="text-center space-y-2">
                {isUploading ? (
                  <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
                ) : (
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isUploading ? "Processing Files..." : "Upload Files"}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* File previews */}
        {previews.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Selected Files ({previews.length})</p>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
            
            <div className="space-y-2">
              {previews.map((preview) => {
                const progress = getFileProgress(preview.file.name);
                return (
                  <Card key={preview.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        {/* File icon/preview */}
                        <div className="flex-shrink-0">
                          {preview.fileType === 'image' && preview.previewUrl ? (
                             <img
                               src={preview.previewUrl}
                               alt={preview.file.name}
                               className="w-20 h-20 object-cover rounded border"
                             />
                          ) : (
                             <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                               <File className="w-8 h-8 text-muted-foreground" />
                             </div>
                          )}
                        </div>

                        {/* File details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{preview.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          
                          {/* Progress */}
                          {progress.status !== 'pending' && (
                             <div className="mt-1">
                               <Progress value={progress.progress} className="h-2" />
                               <p className="text-xs text-muted-foreground mt-1">
                                 {progress.status === 'uploading' 
                                   ? `Uploading... ${progress.progress}%`
                                   : progress.status === 'completed'
                                   ? 'Completed'
                                   : progress.status === 'error'
                                   ? 'Error'
                                   : 'Pending'
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
                        >
                          <X className="w-4 h-4" />
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
    <div className={cn("space-y-4", className)}>
      {/* Drag and drop zone */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {isDragActive ? "Drop files here" : "Drag & drop files here"}
          </h3>
          <p className="text-muted-foreground mb-4">
            or click to browse files
          </p>
          <Button variant="outline" type="button" disabled={disabled || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Browse Files"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* File previews */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Selected Files ({previews.length})</h4>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((preview) => {
              const progress = getFileProgress(preview.file.name);
              return (
                <Card key={preview.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* File preview */}
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {preview.fileType === 'image' && preview.previewUrl ? (
                          <img
                            src={preview.previewUrl}
                            alt={preview.file.name}
                            className="w-full h-full object-cover"
                          />
                         ) : (
                           <File className="w-8 h-8 text-muted-foreground" />
                         )}
                      </div>

                      {/* File details */}
                      <div>
                        <p className="font-medium text-sm truncate" title={preview.file.name}>
                          {preview.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      {/* Progress */}
                      {progress.status !== 'pending' && (
                         <div className="space-y-1">
                           <Progress value={progress.progress} className="h-3" />
                           <p className="text-xs text-muted-foreground">
                             {progress.status === 'uploading' 
                               ? `Uploading... ${progress.progress}%`
                               : progress.status === 'completed'
                               ? 'Completed'
                               : progress.status === 'error'
                               ? 'Error'
                               : 'Pending'
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
                      >
                        <X className="w-4 h-4 mr-1" />
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