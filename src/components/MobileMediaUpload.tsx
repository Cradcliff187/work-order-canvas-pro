
import React, { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  File,
  Plus
} from "lucide-react";
import { formatFileSize, isSupportedImageType, isValidFileSize } from "@/utils/imageCompression";
import { useCamera } from "@/hooks/useCamera";
import { cn } from "@/lib/utils";
import type { UploadProgress } from "@/hooks/useFileUpload";
import { getCameraAttribute } from "@/utils/mobileDetection";
import CameraPermissionHelper from "./CameraPermissionHelper";
import { CameraDebugPanel } from "./CameraDebugPanel";

interface MobileMediaUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  uploadProgress?: UploadProgress[];
  disabled?: boolean;
  className?: string;
  showCamera?: boolean;
  cameraFacingMode?: 'user' | 'environment';
  showDocumentUpload?: boolean;
  compactView?: boolean;
  maxPreviewHeight?: number;
}

interface FilePreview {
  file: File;
  id: string;
  previewUrl: string | null;
  fileType: 'image' | 'document';
}

export function MobileMediaUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  uploadProgress = [],
  disabled = false,
  className,
  showCamera = true,
  cameraFacingMode = 'environment',
  showDocumentUpload = true,
  compactView = false,
  maxPreviewHeight = 200
}: MobileMediaUploadProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);
  const [permissionError, setPermissionError] = useState<'denied' | 'unavailable' | 'not_supported'>();
  const [isCapturing, setIsCapturing] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isSupported: cameraSupported,
    checkCameraPermission,
    debugMode,
    debugInfo,
    errors,
    enableDebug,
    disableDebug,
    collectDebugInfo
  } = useCamera();

  const getFileType = (file: File): 'image' | 'document' => {
    return file.type.startsWith('image/') ? 'image' : 'document';
  };

  const isValidFileType = (file: File): boolean => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const documentTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv'
    ];
    
    return imageTypes.includes(file.type) || documentTypes.includes(file.type);
  };

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    // Check total file count
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
        errors.push(`${file.name}: File type not supported`);
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

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const { valid, errors } = validateFiles(newFiles);
    
    setValidationErrors(errors);

    if (valid.length > 0) {
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
      
      const allFiles = [...previews.map(p => p.file), ...valid];
      onFilesSelected(allFiles);
    }
  }, [validateFiles, previews, onFilesSelected]);

  const handleCameraCapture = useCallback(async () => {
    if (!cameraSupported) return;
    
    setIsCapturing(true);
    
    try {
      const permissionState = await checkCameraPermission();
      
      if (!permissionState.granted) {
        setPermissionError(permissionState.error);
        setShowPermissionHelper(true);
        setIsCapturing(false);
        return;
      }
      
      // Dynamically set capture attribute based on platform
      if (cameraInputRef.current) {
        const captureValue = getCameraAttribute();
        if (captureValue) {
          cameraInputRef.current.setAttribute('capture', captureValue);
        } else {
          cameraInputRef.current.removeAttribute('capture');
        }
      }
      
      cameraInputRef.current?.click();
    } catch (error) {
      console.error('Camera capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [cameraSupported, checkCameraPermission]);

  const handleGallerySelect = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const handleDocumentSelect = useCallback(() => {
    documentInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset input
    event.target.value = '';
  }, [handleFilesSelected]);

  const removeFile = useCallback((id: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== id);
      const removed = prev.find(p => p.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      
      onFilesSelected(updated.map(p => p.file));
      return updated;
    });
    
    if (previews.length <= maxFiles) {
      setValidationErrors([]);
    }
  }, [previews.length, maxFiles, onFilesSelected]);

  const getFileProgress = useCallback((fileName: string): UploadProgress | undefined => {
    return uploadProgress.find(p => p.fileName === fileName);
  }, [uploadProgress]);

  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="w-6 h-6 text-green-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'csv':
        return <FileText className="w-6 h-6 text-orange-500" />;
      default:
        return <File className="w-6 h-6 text-gray-500" />;
    }
  };

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
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="sr-only"
        disabled={disabled}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="sr-only"
        disabled={disabled}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.docx,.doc,.csv"
        multiple
        onChange={handleFileInputChange}
        className="sr-only"
        disabled={disabled}
      />

      {/* Mobile Action Bar */}
      <div className={cn(
        "flex gap-2",
        compactView ? "flex-col" : "flex-row"
      )}>
        {showCamera && cameraSupported && (
          <Button
            size="lg"
            variant="default"
            className={cn(
              "flex-1 h-12 touch-manipulation",
              compactView && "w-full"
            )}
            onClick={handleCameraCapture}
            disabled={disabled || isCapturing}
          >
            {isCapturing ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Camera className="w-5 h-5 mr-2" />
            )}
            Camera
          </Button>
        )}
        
        <Button
          size="lg"
          variant="outline"
          className={cn(
            "flex-1 h-12 touch-manipulation",
            compactView && "w-full"
          )}
          onClick={handleGallerySelect}
          disabled={disabled}
        >
          <ImageIcon className="w-5 h-5 mr-2" />
          Gallery
        </Button>
        
        {showDocumentUpload && (
          <Button
            size="lg"
            variant="outline"
            className={cn(
              "flex-1 h-12 touch-manipulation",
              compactView && "w-full"
            )}
            onClick={handleDocumentSelect}
            disabled={disabled}
          >
            <FileText className="w-5 h-5 mr-2" />
            Documents
          </Button>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
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
                onClick={() => {
                  previews.forEach(preview => {
                    if (preview.previewUrl) {
                      URL.revokeObjectURL(preview.previewUrl);
                    }
                  });
                  setPreviews([]);
                  setValidationErrors([]);
                  onFilesSelected([]);
                }}
                disabled={disabled}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previews.map((preview) => {
                const progress = getFileProgress(preview.file.name);
                
                return (
                  <div key={preview.id} className="relative group">
                    <Card className="overflow-hidden">
                      <div 
                        className="relative bg-muted"
                        style={{ height: compactView ? 120 : maxPreviewHeight }}
                      >
                        {preview.fileType === 'image' && preview.previewUrl ? (
                          <img
                            src={preview.previewUrl}
                            alt={preview.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              {getDocumentIcon(preview.file.name)}
                              <div className="text-xs font-medium text-muted-foreground mt-1">
                                {preview.file.name.split('.').pop()?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
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
                                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                              )}
                              {progress.status === 'uploading' && (
                                <Camera className="w-8 h-8 mx-auto" />
                              )}
                              <div className="text-sm capitalize font-medium">
                                {progress.status}
                              </div>
                              {progress.progress > 0 && (
                                <Progress 
                                  value={progress.progress} 
                                  className="w-24 h-2" 
                                />
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Success indicator */}
                        {progress?.status === 'completed' && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="default" className="bg-green-500 text-white">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Done
                            </Badge>
                          </div>
                        )}
                        
                        {/* Error indicator */}
                        {progress?.status === 'error' && (
                          <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                            <div className="text-center p-2">
                              <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                              <div className="text-xs text-destructive">
                                {progress.error}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2">
                        <div className="flex items-center space-x-2">
                          {preview.fileType === 'image' ? (
                            <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <File className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium truncate">
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

      {/* Upload Instructions */}
      {previews.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Add Media Files</h3>
            <p className="text-sm text-muted-foreground">
              Use the buttons above to capture photos, select from gallery, or upload documents
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Max {formatFileSize(maxSizeBytes)} per file • Up to {maxFiles} files
            </p>
          </CardContent>
        </Card>
      )}

      <CameraPermissionHelper
        isVisible={showPermissionHelper}
        onClose={() => setShowPermissionHelper(false)}
        onRetry={async () => {
          setShowPermissionHelper(false);
          handleCameraCapture();
        }}
        permissionDeniedReason={permissionError}
        showFallbackOption={true}
        onUseFallback={() => {
          setShowPermissionHelper(false);
          galleryInputRef.current?.click();
        }}
      />

      {/* Debug Panel - Development Only */}
      {import.meta.env.MODE === 'development' && (
        <CameraDebugPanel
          debugMode={debugMode}
          debugInfo={debugInfo}
          errors={errors}
          onToggleDebug={() => debugMode ? disableDebug() : enableDebug()}
          onRefreshInfo={collectDebugInfo}
        />
      )}
    </div>
  );
}
