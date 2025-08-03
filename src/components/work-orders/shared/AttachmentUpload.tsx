import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  Upload,
  X,
  Plus,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatFileSize, getFileIcon, getSupportedFormatsText, isSupportedFileType, getFileTypeForStorage } from '@/utils/fileUtils';
import { cn } from '@/lib/utils';
import type { UploadProgress } from '@/hooks/useFileUpload';

interface FilePreview {
  file: File;
  id: string;
  previewUrl?: string;
}

interface AttachmentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  isUploading?: boolean;
  uploadProgress?: UploadProgress[];
  disabled?: boolean;
  className?: string;
}

export function AttachmentUpload({
  onUpload,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10,
  isUploading = false,
  uploadProgress = [],
  disabled = false,
  className
}: AttachmentUploadProps) {
  const isMobile = useIsMobile();
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // File input refs for mobile
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate files
  const validateFiles = useCallback((files: File[]) => {
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    if (selectedFiles.length + files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      return { validFiles: [], errors: newErrors };
    }

    files.forEach(file => {
      if (file.size > maxFileSize) {
        newErrors.push(`${file.name} is too large (max ${formatFileSize(maxFileSize)})`);
      } else {
        validFiles.push(file);
      }
    });

    return { validFiles, errors: newErrors };
  }, [maxFileSize, maxFiles, selectedFiles.length]);

  // Handle file selection
  const handleFilesSelected = useCallback((files: File[]) => {
    const { validFiles, errors: newErrors } = validateFiles(files);
    setErrors(newErrors);

    if (validFiles.length > 0) {
      const newPreviews: FilePreview[] = validFiles.map(file => {
        const id = crypto.randomUUID();
        let previewUrl: string | undefined;

        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }

        return { file, id, previewUrl };
      });

      setSelectedFiles(prev => [...prev, ...newPreviews]);
    }
  }, [validateFiles]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      await onUpload(selectedFiles.map(f => f.file));
      // Clean up preview URLs
      selectedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setSelectedFiles([]);
      setIsSheetOpen(false);
      setErrors([]);
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors(['Upload failed. Please try again.']);
    }
  }, [selectedFiles, onUpload]);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    selectedFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setSelectedFiles([]);
    setErrors([]);
  }, [selectedFiles]);

  // Calculate total size
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

  // Calculate total upload progress
  const totalProgress = uploadProgress.length > 0 
    ? Math.round(uploadProgress.reduce((sum, p) => sum + p.progress, 0) / uploadProgress.length)
    : 0;

  // Get file progress
  const getFileProgress = (fileName: string) => {
    return uploadProgress.find(p => p.fileName === fileName)?.progress || 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  // Desktop drag-and-drop interface
  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFilesSelected(acceptedFiles);
  }, [handleFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, open } = useDropzone({
    onDrop,
    accept: { '*/*': [] },
    disabled: disabled || isUploading,
    multiple: true,
    noClick: false,
    noKeyboard: false
  });

  const DesktopUpload = () => {
    // Handle explicit click for browse functionality
    const handleBrowseClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        open();
      }
    }, [disabled, isUploading, open]);

    return (
      <div className={cn("space-y-4", className)}>
        {/* Drag and drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragActive && "border-primary bg-primary/5",
            isDragAccept && "border-primary bg-primary/5",
            isDragReject && "border-destructive bg-destructive/5",
            !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <Upload className={cn(
              "w-12 h-12 mx-auto",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop files here" : "Drag & drop files here"}
              </p>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                disabled={disabled || isUploading}
              >
                or click to browse
              </button>
              <p className="text-xs text-muted-foreground">
                All file types supported • Max {formatFileSize(maxFileSize)} per file • Up to {maxFiles} files
              </p>
            </div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {errors.map((error, i) => (
              <p key={i} className="text-sm text-destructive">{error}</p>
            ))}
          </div>
        )}

        {/* Selected files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-muted-foreground">
                  Total size: {formatFileSize(totalSize)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFiles}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || selectedFiles.length === 0}
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                      Uploading... {totalProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* File list */}
            <div className="grid gap-2">
              {selectedFiles.map((filePreview) => {
                const progress = getFileProgress(filePreview.file.name);
                const IconComponent = getFileIcon(filePreview.file.name, filePreview.file.type) === 'image' 
                  ? ImageIcon : File;

                return (
                  <Card key={filePreview.id} className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Preview or icon */}
                      <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {filePreview.previewUrl ? (
                          <img
                            src={filePreview.previewUrl}
                            alt={filePreview.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <IconComponent className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {filePreview.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(filePreview.file.size)}
                        </p>
                        {isUploading && progress > 0 && (
                          <div className="mt-2">
                            <Progress value={progress} className="h-1" />
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(filePreview.id)}
                        disabled={isUploading}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading files...</span>
                  <span>{totalProgress}%</span>
                </div>
                <Progress value={totalProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Mobile upload options
  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handlePhotoSelect = () => {
    photoInputRef.current?.click();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleMobileFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset input
    event.target.value = '';
  };

  // Mobile upload interface with Claude-style bottom sheet
  const MobileUpload = () => (
    <div className={cn("space-y-4", className)}>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button 
            className="w-full" 
            size="lg"
            disabled={disabled || isUploading}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Attachments
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Add Attachments</SheetTitle>
            <SheetDescription>
              Choose how you'd like to add files. All file types supported.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Upload options */}
            <div className="grid gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCameraCapture}
                disabled={disabled || isUploading}
                className="h-auto p-4 justify-start"
              >
                <Camera className="w-6 h-6 mr-4" />
                <div className="text-left">
                  <div className="font-medium">Take Photo</div>
                  <div className="text-xs text-muted-foreground">Use camera to capture image</div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handlePhotoSelect}
                disabled={disabled || isUploading}
                className="h-auto p-4 justify-start"
              >
                <ImageIcon className="w-6 h-6 mr-4" />
                <div className="text-left">
                  <div className="font-medium">Photo Library</div>
                  <div className="text-xs text-muted-foreground">Select from your photos</div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleFileSelect}
                disabled={disabled || isUploading}
                className="h-auto p-4 justify-start"
              >
                <File className="w-6 h-6 mr-4" />
                <div className="text-left">
                  <div className="font-medium">Browse Files</div>
                  <div className="text-xs text-muted-foreground">Choose any file type</div>
                </div>
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleMobileFileChange}
              className="hidden"
              multiple
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleMobileFileChange}
              className="hidden"
              multiple
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleMobileFileChange}
              className="hidden"
              multiple
            />

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {errors.map((error, i) => (
                  <p key={i} className="text-sm text-destructive">{error}</p>
                ))}
              </div>
            )}

            {/* Selected files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatFileSize(totalSize)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFiles}
                      disabled={isUploading}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || selectedFiles.length === 0}
                      size="sm"
                    >
                      {isUploading ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-pulse" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* File list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((filePreview) => {
                    const progress = getFileProgress(filePreview.file.name);
                    const IconComponent = getFileIcon(filePreview.file.name, filePreview.file.type) === 'image' 
                      ? ImageIcon : File;

                    return (
                      <Card key={filePreview.id} className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Preview or icon */}
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {filePreview.previewUrl ? (
                              <img
                                src={filePreview.previewUrl}
                                alt={filePreview.file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <IconComponent className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>

                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {filePreview.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(filePreview.file.size)}
                            </p>
                            {isUploading && progress > 0 && (
                              <div className="mt-2">
                                <Progress value={progress} className="h-1" />
                              </div>
                            )}
                          </div>

                          {/* Remove button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(filePreview.id)}
                            disabled={isUploading}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading files...</span>
                      <span>{totalProgress}%</span>
                    </div>
                    <Progress value={totalProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Upload status when not in sheet */}
      {isUploading && !isSheetOpen && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 animate-pulse" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Uploading files...</span>
                  <span>{totalProgress}%</span>
                </div>
                <Progress value={totalProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {isMobile ? <MobileUpload /> : <DesktopUpload />}
    </div>
  );
}