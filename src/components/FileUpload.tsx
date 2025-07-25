import React, { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  FileText,
  File
} from "lucide-react";
import { formatFileSize, isSupportedImageType, isValidFileSize } from "@/utils/imageCompression";
import { cn } from "@/lib/utils";
import type { UploadProgress } from "@/hooks/useFileUpload";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  uploadProgress?: UploadProgress[];
  disabled?: boolean;
  className?: string;
  acceptedTypes?: string[];
}

interface FilePreview {
  file: File;
  id: string;
  previewUrl: string | null;
  fileType: 'image' | 'document';
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  uploadProgress = [],
  disabled = false,
  className,
  acceptedTypes = ['image/*']
}: FileUploadProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper functions
  const isImageAccepted = acceptedTypes.some(type => type.includes('image'));
  const isDocumentMode = acceptedTypes.some(type => 
    type.includes('.pdf') || type.includes('.xlsx') || type.includes('.xls') || 
    type.includes('.doc') || type.includes('.docx') || type.includes('.csv')
  );

  const getFileType = (file: File): 'image' | 'document' => {
    return file.type.startsWith('image/') ? 'image' : 'document';
  };

  const isValidFileType = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return acceptedTypes.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/');
      if (type.startsWith('.')) return fileExtension === type;
      return file.type === type;
    });
  };

  const getSupportedFormatsText = (): string => {
    const types = [];
    if (isImageAccepted) types.push('Images');
    if (isDocumentMode) types.push('PDF, Excel, Word, CSV');
    return types.join(', ');
  };

  const getDropzoneAccept = () => {
    const accept: Record<string, string[]> = {};
    
    acceptedTypes.forEach(type => {
      if (type === 'image/*') {
        accept['image/*'] = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
      } else if (type.includes('pdf')) {
        accept['application/pdf'] = ['.pdf'];
      } else if (type.includes('xlsx') || type.includes('xls')) {
        accept['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx'];
        accept['application/vnd.ms-excel'] = ['.xls'];
      } else if (type.includes('csv')) {
        accept['text/csv'] = ['.csv'];
      } else if (type.includes('doc')) {
        accept['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
        accept['application/msword'] = ['.doc'];
      } else if (type.startsWith('.')) {
        // Handle file extensions
        const extension = type;
        if (extension === '.pdf') {
          accept['application/pdf'] = ['.pdf'];
        } else if (extension === '.xlsx') {
          accept['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx'];
        } else if (extension === '.xls') {
          accept['application/vnd.ms-excel'] = ['.xls'];
        } else if (extension === '.csv') {
          accept['text/csv'] = ['.csv'];
        } else if (extension === '.docx') {
          accept['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
        } else if (extension === '.doc') {
          accept['application/msword'] = ['.doc'];
        }
      }
    });

    return accept;
  };

  // Validate files
  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    // Check total file count including existing previews
    const totalFiles = previews.length + files.length;
    if (totalFiles > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed (currently have ${previews.length})`);
      return { valid: [], errors };
    }

    files.forEach(file => {
      // Check if already added
      if (previews.some(p => p.file.name === file.name && p.file.size === file.size)) {
        errors.push(`${file.name}: File already added`);
        return;
      }

      // Check file type
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: File type not supported. Accepted: ${getSupportedFormatsText()}`);
        return;
      }

      // Check file size
      if (!isValidFileSize(file, maxSizeBytes)) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        errors.push(`${file.name}: File size exceeds ${maxMB}MB limit`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [previews, maxFiles, maxSizeBytes]);

  // Handle file selection
  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const { valid, errors } = validateFiles(newFiles);
    
    setValidationErrors(errors);

    if (valid.length > 0) {
      // Create previews for valid files
      const newPreviews: FilePreview[] = valid.map((file, index) => {
        const fileType = getFileType(file);
        return {
          file,
          id: `${Date.now()}_${index}`,
          previewUrl: fileType === 'image' ? URL.createObjectURL(file) : null,
          fileType
        };
      });

      setPreviews(prev => [...prev, ...newPreviews]);
      
      // Get all files including existing ones
      const allFiles = [...previews.map(p => p.file), ...valid];
      onFilesSelected(allFiles);
    }
  }, [validateFiles, previews, onFilesSelected]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop: handleFilesSelected,
    accept: getDropzoneAccept(),
    multiple: true,
    disabled,
    maxFiles,
    maxSize: maxSizeBytes,
    noClick: false,
    noKeyboard: false
  });

  // Handle browse files click
  const handleBrowseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Browse files clicked, opening file picker...');
    if (open && !disabled) {
      open();
    }
  }, [open, disabled]);

  // Remove file preview
  const removeFile = useCallback((id: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== id);
      // Revoke URL to prevent memory leaks
      const removed = prev.find(p => p.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      
      // Update parent with remaining files
      onFilesSelected(updated.map(p => p.file));
      return updated;
    });
    
    // Clear validation errors when files are removed
    if (previews.length <= maxFiles) {
      setValidationErrors([]);
    }
  }, [previews.length, maxFiles, onFilesSelected]);

  // Clear all files
  const clearAll = useCallback(() => {
    // Revoke all preview URLs
    previews.forEach(preview => {
      if (preview.previewUrl) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    });
    
    setPreviews([]);
    setValidationErrors([]);
    onFilesSelected([]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previews, onFilesSelected]);

  // Get upload progress for a specific file
  const getFileProgress = useCallback((fileName: string): UploadProgress | undefined => {
    return uploadProgress.find(p => p.fileName === fileName);
  }, [uploadProgress]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <Card className={cn(
        "border-2 border-dashed transition-colors",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={cn(
              "flex flex-col items-center justify-center space-y-4 text-center cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-muted text-muted-foreground transition-colors",
              isDragActive && !isDragReject && "bg-primary text-primary-foreground",
              isDragReject && "bg-destructive text-destructive-foreground"
            )}>
              <Upload className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                {isDragActive 
                  ? isDragReject 
                    ? "Invalid file type" 
                    : "Drop files here"
                  : isImageAccepted && !isDocumentMode 
                    ? "Drag & drop images here"
                    : "Drag & drop files here"
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                or <span 
                  className="text-primary underline cursor-pointer" 
                  onClick={handleBrowseClick}
                >
                  browse files
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports {getSupportedFormatsText()} • Max {formatFileSize(maxSizeBytes)} per file • Up to {maxFiles} files
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-destructive">Upload Errors</h4>
                <ul className="text-sm text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Previews */}
      {previews.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">
                Selected Files ({previews.length}/{maxFiles})
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                type="button"
                onClick={clearAll}
                disabled={disabled}
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {previews.map((preview) => {
                const progress = getFileProgress(preview.file.name);
                
                return (
                  <div key={preview.id} className="relative group">
                    <Card className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {preview.fileType === 'image' && preview.previewUrl ? (
                          <img
                            src={preview.previewUrl}
                            alt={preview.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                              <div className="text-sm font-medium text-muted-foreground">
                                {preview.file.name.split('.').pop()?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          className="absolute top-2 right-2 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(preview.id)}
                          disabled={disabled}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        
                        {/* Upload progress overlay */}
                        {progress && progress.status !== 'completed' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-white text-center space-y-2">
                              {progress.status === 'compressing' && (
                                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                              )}
                              {progress.status === 'uploading' && (
                                <Upload className="w-6 h-6 mx-auto" />
                              )}
                              <div className="text-sm capitalize">{progress.status}</div>
                              {progress.progress > 0 && (
                                <Progress 
                                  value={progress.progress} 
                                  className="w-20 h-1" 
                                />
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Success indicator */}
                        {progress?.status === 'completed' && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          </div>
                        )}
                        
                        {/* Error indicator */}
                        {progress?.status === 'error' && (
                          <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                            <div className="text-center">
                              <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                              <div className="text-xs text-destructive px-2">
                                {progress.error}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <div className="flex items-center space-x-2">
                          {preview.fileType === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <File className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {preview.file.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(preview.file.size)}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}