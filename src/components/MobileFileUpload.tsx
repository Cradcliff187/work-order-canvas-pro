import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Upload,
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/imageCompression';
import { useCamera } from '@/hooks/useCamera';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UploadProgress } from '@/hooks/useFileUpload';
import { getCameraAttribute, isMobileBrowser } from '@/utils/mobileDetection';
import CameraPermissionHelper from './CameraPermissionHelper';
import { CameraDebugPanel } from './CameraDebugPanel';

interface MobileFileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  uploadProgress?: UploadProgress[];
  disabled?: boolean;
  className?: string;
  acceptedTypes?: string[];
  showCameraButton?: boolean;
  showGalleryButton?: boolean;
  showDocumentButton?: boolean;
}

interface FilePreview {
  file: File;
  id: string;
  previewUrl: string | null;
  fileType: 'image' | 'document';
}

export function MobileFileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  uploadProgress = [],
  disabled = false,
  className,
  acceptedTypes = ['image/*'],
  showCameraButton = true,
  showGalleryButton = true,
  showDocumentButton = false
}: MobileFileUploadProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);
  const [permissionError, setPermissionError] = useState<'denied' | 'unavailable' | 'not_supported'>();
  const [isCapturing, setIsCapturing] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    checkCameraPermission,
    debugMode,
    debugInfo,
    errors,
    enableDebug,
    disableDebug,
    collectDebugInfo
  } = useCamera();
  const isMobile = useIsMobile();

  // Helper functions
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
        errors.push(`${file.name}: File type not supported`);
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
  }, [previews, maxFiles, maxSizeBytes, acceptedTypes]);

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

  // Camera capture with permission check
  const handleCameraCapture = async () => {
    const permissionState = await checkCameraPermission();
    
    if (!permissionState.granted) {
      setPermissionError(permissionState.error);
      setShowPermissionHelper(true);
      return;
    }
    
    if (cameraInputRef.current) {
      const captureValue = getCameraAttribute();
      if (captureValue) {
        cameraInputRef.current.setAttribute('capture', captureValue);
      } else {
        cameraInputRef.current.removeAttribute('capture');
      }
      cameraInputRef.current.click();
    }
  };

  // Gallery selection
  const handleGallerySelect = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  // Document selection
  const handleDocumentSelect = () => {
    if (documentInputRef.current) {
      documentInputRef.current.click();
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset the input
    event.target.value = '';
  };

  // Remove file
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
  }, [previews, onFilesSelected]);

  // Get upload progress for a specific file
  const getFileProgress = useCallback((fileName: string): UploadProgress | undefined => {
    return uploadProgress.find(p => p.fileName === fileName);
  }, [uploadProgress]);

  // Get document icon based on file extension
  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'csv':
        return '📈';
      default:
        return '📎';
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
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {showCameraButton && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraCapture}
              disabled={disabled || isCapturing}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="sr-only"
              disabled={disabled}
            />
          </>
        )}
        
        {showGalleryButton && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGallerySelect}
              disabled={disabled}
              className="flex-1"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Gallery
            </Button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple={true}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </>
        )}
        
        {showDocumentButton && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDocumentSelect}
              disabled={disabled}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
              multiple={true}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-destructive">Upload Errors</h4>
                <ul className="text-xs text-destructive space-y-1">
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
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">
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
            
            <div className="space-y-3">
              {previews.map((preview) => {
                const progress = getFileProgress(preview.file.name);
                
                return (
                  <div key={preview.id} className="relative">
                    <Card className="overflow-hidden">
                      <div className="flex">
                        {/* Preview/Icon */}
                        <div className="w-16 h-16 bg-muted relative flex-shrink-0">
                          {preview.fileType === 'image' && preview.previewUrl ? (
                            <img
                              src={preview.previewUrl}
                              alt={preview.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {getDocumentIcon(preview.file.name)}
                            </div>
                          )}
                          
                          {/* Upload progress overlay */}
                          {progress && progress.status !== 'completed' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              {progress.status === 'compressing' && (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                              )}
                              {progress.status === 'uploading' && (
                                <Upload className="w-4 h-4 text-white" />
                              )}
                            </div>
                          )}
                          
                          {/* Success indicator */}
                          {progress?.status === 'completed' && (
                            <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          )}
                          
                          {/* Error indicator */}
                          {progress?.status === 'error' && (
                            <div className="absolute inset-0 bg-destructive/90 flex items-center justify-center">
                              <AlertCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* File Details */}
                        <div className="flex-1 p-3 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                {preview.fileType === 'image' ? (
                                  <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">
                                  {preview.file.name}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatFileSize(preview.file.size)}
                              </div>
                              
                              {/* Progress bar */}
                              {progress && progress.status === 'uploading' && progress.progress > 0 && (
                                <div className="mt-2">
                                  <Progress 
                                    value={progress.progress} 
                                    className="h-1" 
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {progress.progress}% uploaded
                                  </div>
                                </div>
                              )}
                              
                              {/* Error message */}
                              {progress?.status === 'error' && (
                                <div className="text-xs text-destructive mt-1">
                                  {progress.error}
                                </div>
                              )}
                            </div>
                            
                            {/* Remove button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFile(preview.id)}
                              disabled={disabled}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
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
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No files selected. Use the buttons above to add files.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max {formatFileSize(maxSizeBytes)} per file • Up to {maxFiles} files
            </p>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      <CameraDebugPanel
        debugMode={debugMode}
        debugInfo={debugInfo}
        errors={errors}
        onToggleDebug={debugMode ? disableDebug : enableDebug}
        onRefreshInfo={collectDebugInfo}
      />

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
    </div>
  );
}