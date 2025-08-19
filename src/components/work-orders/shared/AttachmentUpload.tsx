import React, { useState, useCallback } from 'react';
import { Upload, Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Progress } from '@/components/ui/progress';
import type { UploadProgress } from '@/hooks/useFileUpload';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * AttachmentUpload - Form-integrated upload with business logic
 * 
 * Ideal for:
 * - Work orders, invoices, and form submissions
 * - Business workflows requiring internal/external file controls
 * - Admin-controlled upload processes
 * 
 * Features:
 * - Form integration with staged/immediate modes
 * - Admin-only internal/external file toggles
 * - Business-specific upload workflows
 * - Progress tracking for form submissions
 */
interface AttachmentUploadProps {
  onUpload: (files: File[], isInternal?: boolean) => Promise<void>;
  
  /**
   * Upload mode controls the file handling behavior:
   * - 'immediate': Files are sent to parent immediately on selection (legacy behavior)
   * - 'staged': Files are held internally until explicit upload action (new behavior)
   * @default 'staged' for form contexts, 'immediate' for standalone
   */
  mode?: 'immediate' | 'staged';
  
  /**
   * How to handle multiple file selections:
   * - 'replace': New files replace all previous selections (default, predictable behavior)
   * - 'accumulate': New files add to existing selection
   * @default 'replace' for predictable behavior
   */
  selectionMode?: 'accumulate' | 'replace';
  
  // File constraints - standardized across all upload components
  maxFiles?: number;
  maxSizeBytes?: number; // renamed from maxFileSize for consistency
  acceptedTypes?: string[];
  
  // Legacy prop for backward compatibility
  maxFileSize?: number; // in bytes - deprecated, use maxSizeBytes
  
  // Upload state
  isUploading?: boolean;
  uploadProgress?: UploadProgress[]; // Will be converted internally to standardized format
  
  // Control props
  disabled?: boolean;
  className?: string;
  
  // Business-specific features
  showInternalToggle?: boolean; // Only show for admins/employees
  isFormContext?: boolean; // true for work order forms, false for standalone uploads
}

export function AttachmentUpload({
  onUpload,
  mode = 'staged', // Default to staged for form contexts
  selectionMode = 'replace', // Default to replace for predictable behavior
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  acceptedTypes = [],
  maxFileSize, // Legacy prop - deprecated
  isUploading = false,
  uploadProgress = [],
  disabled = false,
  className,
  showInternalToggle = false,
  isFormContext = false
}: AttachmentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const { profile: userProfile, isAdmin } = useUserProfile();
  const { triggerHaptic, onFormSave } = useHapticFeedback();
  const isMobile = useIsMobile();

  // Use legacy maxFileSize if provided, otherwise use maxSizeBytes
  const effectiveMaxSizeBytes = maxFileSize || maxSizeBytes;

  // Convert UploadProgress[] to the format expected by UniversalUploadSheet
  const formattedProgress = uploadProgress.reduce((acc, progress) => {
    acc[progress.fileName] = {
      progress: progress.progress,
      status: progress.status as 'pending' | 'uploading' | 'completed' | 'error'
    };
    return acc;
  }, {} as { [fileName: string]: { progress: number; status: 'pending' | 'uploading' | 'completed' | 'error' } });

  // Unified file selection handler for both immediate and staged modes
  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    
    // Haptic feedback for file selection
    triggerHaptic({ pattern: 'medium' });
    
    // In immediate mode, trigger upload right away (if not in form context)
    if (mode === 'immediate' && !isFormContext) {
      onUpload(files, isInternal);
    }
  }, [mode, isFormContext, onUpload, isInternal, triggerHaptic]);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length > 0) {
      onFormSave(); // Haptic feedback for upload action
      await onUpload(selectedFiles, isInternal);
      setSelectedFiles([]);
      setIsInternal(false);
    }
  }, [selectedFiles, onUpload, isInternal, onFormSave]);

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
    setIsInternal(false);
    triggerHaptic({ pattern: 'light' }); // Light haptic for clear action
  }, [triggerHaptic]);

  return (
    <div className={cn("space-y-4", className)}>
      <UniversalUploadSheet
        mode={mode}
        selectionMode={selectionMode}
        trigger={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "upload-trigger-enhanced w-full border-dashed border-2",
              isMobile ? "h-20 mobile-upload-trigger" : "h-20",
              isUploading && "processing",
              mode === 'immediate' && selectedFiles.length > 0 && !isUploading && "success"
            )}
            disabled={disabled || isUploading}
          >
            <div className="text-center">
              {isUploading ? (
                <Loader2 className={cn("mx-auto mb-2 text-primary animate-spin upload-icon", 
                  isMobile ? "h-8 w-8" : "h-6 w-6")} />
              ) : mode === 'immediate' && selectedFiles.length > 0 ? (
                <CheckCircle className={cn("upload-success-icon mx-auto mb-2", 
                  isMobile ? "h-8 w-8" : "h-6 w-6")} />
              ) : (
                <Upload className={cn("upload-icon-bounce mx-auto mb-2 text-muted-foreground upload-icon", 
                  isMobile ? "h-8 w-8" : "h-6 w-6")} />
              )}
              <p className={cn("font-medium", isMobile ? "text-base" : "text-sm")}>
                {isUploading ? "Processing Files..." : mode === 'immediate' && selectedFiles.length > 0 ? (
                  "Files uploaded successfully"
                ) : selectedFiles.length > 0 ? (
                  <span className="flex items-center gap-2 justify-center">
                    {selectionMode === 'accumulate' ? 'Add Files' : 'Select Files'}
                    <Badge variant="secondary" className={isMobile ? "text-sm" : "text-xs"}>
                      {selectedFiles.length}
                    </Badge>
                  </span>
                ) : "Select Files"}
              </p>
              <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
                {isUploading ? "Please wait..." : mode === 'immediate' && selectedFiles.length > 0 ? (
                  "Ready for next upload"
                ) : mode === 'staged' && selectedFiles.length > 0 ? 
                    (selectionMode === 'accumulate' ? 'Adding to selection' : 'New selection will replace existing') :
                    "Click to select files"
                }
              </p>
            </div>
          </Button>
        }
        onFilesSelected={mode === 'immediate' ? handleFilesSelected : undefined}
        onFilesStaged={mode === 'staged' ? handleFilesSelected : undefined}
        maxFiles={maxFiles}
        maxSizeBytes={effectiveMaxSizeBytes}
        acceptedTypes={acceptedTypes}
        accept="*/*" // Legacy fallback
        multiple={true}
        isProcessing={isUploading}
        uploadProgress={formattedProgress}
        selectedFileCount={selectedFiles.length}
        context="work-order"
      />

      {/* Mode-specific alerts */}
      {selectedFiles.length > 0 && !isUploading && (
        <Alert>
          <AlertDescription>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected.
            {isFormContext && mode === 'staged' ? ' Files will be uploaded when you submit the form.' : 
             mode === 'staged' ? ' Click upload when ready.' : 
             ' Files uploaded immediately on selection.'}
          </AlertDescription>
        </Alert>
      )}
      
      {selectedFiles.length > 0 && !isUploading && (
        <div className="space-y-3">
          {showInternalToggle && isAdmin && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="attachment-internal"
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              />
              <Label htmlFor="attachment-internal" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Make internal (only visible to admins and assigned subcontractors)
              </Label>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready to upload
            </span>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"}
                onClick={clearSelection}
                className={cn(isMobile ? "mobile-upload-button" : "")}
              >
                Clear
              </Button>
              {mode === 'staged' && !isFormContext && (
                <Button 
                  size={isMobile ? "default" : "sm"}
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={cn(
                    "upload-trigger-enhanced",
                    isUploading && "processing",
                    isMobile && "mobile-upload-button"
                  )}
                >
                  {isUploading ? (
                    <Loader2 className={cn("mr-2 animate-spin", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  ) : (
                    <Upload className={cn("upload-icon-bounce mr-2", isMobile ? "w-5 h-5" : "w-4 h-4")} />
                  )}
                  {isUploading ? "Uploading..." : "Upload Selected Files"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Display */}
      {isUploading && uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Upload Progress</h4>
          <div className="space-y-2">
            {uploadProgress.map((progress) => (
              <div key={progress.fileName} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm truncate">{progress.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {progress.progress}%
                  </span>
                </div>
                <Progress value={progress.progress} className="h-2" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground capitalize">
                    {progress.status}
                  </span>
                  {progress.status === 'error' && (
                    <span className="text-xs text-destructive">Failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}