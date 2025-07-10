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
  Loader2
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
}

interface FilePreview {
  file: File;
  id: string;
  previewUrl: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  uploadProgress = [],
  disabled = false,
  className
}: FileUploadProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (!isSupportedImageType(file)) {
        errors.push(`${file.name}: Only image files are allowed (JPG, PNG, WebP, HEIC)`);
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
      const newPreviews: FilePreview[] = valid.map((file, index) => ({
        file,
        id: `${Date.now()}_${index}`,
        previewUrl: URL.createObjectURL(file)
      }));

      setPreviews(prev => [...prev, ...newPreviews]);
      
      // Get all files including existing ones
      const allFiles = [...previews.map(p => p.file), ...valid];
      onFilesSelected(allFiles);
    }
  }, [validateFiles, previews, onFilesSelected]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleFilesSelected,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']
    },
    multiple: true,
    disabled,
    maxFiles,
    maxSize: maxSizeBytes
  });

  // Remove file preview
  const removeFile = useCallback((id: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== id);
      // Revoke URL to prevent memory leaks
      const removed = prev.find(p => p.id === id);
      if (removed) {
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
      URL.revokeObjectURL(preview.previewUrl);
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
        URL.revokeObjectURL(preview.previewUrl);
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
            <input {...getInputProps()} ref={fileInputRef} />
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
                  : "Drag & drop images here"
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                or <Button variant="link" className="h-auto p-0 text-primary">browse files</Button>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, WebP, HEIC • Max {formatFileSize(maxSizeBytes)} per file • Up to {maxFiles} files
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
                        <img
                          src={preview.previewUrl}
                          alt={preview.file.name}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Remove button */}
                        <Button
                          variant="destructive"
                          size="sm"
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
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
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