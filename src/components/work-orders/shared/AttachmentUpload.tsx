import React, { useState, useCallback } from 'react';
import { Upload, Lock, Loader2 } from 'lucide-react';
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

interface AttachmentUploadProps {
  onUpload: (files: File[], isInternal?: boolean) => Promise<void>;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  isUploading?: boolean;
  uploadProgress?: UploadProgress[];
  disabled?: boolean;
  className?: string;
  showInternalToggle?: boolean; // Only show for admins/employees
  isFormContext?: boolean; // true for work order forms, false for standalone uploads
}

export function AttachmentUpload({
  onUpload,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10,
  isUploading = false,
  uploadProgress = [],
  disabled = false,
  className,
  showInternalToggle = false,
  isFormContext = false
}: AttachmentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hasFilesToUpload, setHasFilesToUpload] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const { profile: userProfile, isAdmin } = useUserProfile();

  // Convert UploadProgress[] to the format expected by UnifiedFileUpload
  const formattedProgress = uploadProgress.reduce((acc, progress) => {
    acc[progress.fileName] = {
      progress: progress.progress,
      status: progress.status as 'pending' | 'uploading' | 'completed' | 'error'
    };
    return acc;
  }, {} as { [fileName: string]: { progress: number; status: 'pending' | 'uploading' | 'completed' | 'error' } });

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setHasFilesToUpload(files.length > 0);
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length > 0) {
      await onUpload(selectedFiles, isInternal);
      setSelectedFiles([]);
      setHasFilesToUpload(false);
      setIsInternal(false);
    }
  }, [selectedFiles, onUpload, isInternal]);

  return (
    <div className={cn("space-y-4", className)}>
      <UniversalUploadSheet
        trigger={
          <Button
            type="button"
            variant="outline"
            className="w-full h-20 border-dashed border-2 hover:border-primary/50"
            disabled={disabled || isUploading}
          >
            <div className="text-center">
              {isUploading ? (
                <Loader2 className="h-6 w-6 mx-auto mb-2 text-primary animate-spin" />
              ) : (
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {isUploading ? "Processing Files..." : (selectedFiles.length > 0 ? (
                  <span className="flex items-center gap-2 justify-center">
                    Select Files
                    <Badge variant="secondary" className="text-xs">
                      {selectedFiles.length}
                    </Badge>
                  </span>
                ) : "Select Files")}
              </p>
              <p className="text-xs text-muted-foreground">
                {isUploading ? "Please wait..." : "Click to select files"}
              </p>
            </div>
          </Button>
        }
        onFilesSelected={handleFilesSelected}
        accept="*/*"
        multiple={true}
        isProcessing={isUploading}
        selectedFileCount={selectedFiles.length}
      />

      {/* Alert for form context explaining when files will be uploaded */}
      {selectedFiles.length > 0 && isFormContext && !isUploading && (
        <Alert>
          <AlertDescription>
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected. Files will be uploaded when you submit the form.
          </AlertDescription>
        </Alert>
      )}
      
      {hasFilesToUpload && !isUploading && (
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
                size="sm"
                onClick={() => {
                  setSelectedFiles([]);
                  setHasFilesToUpload(false);
                  setIsInternal(false);
                }}
              >
                Clear
              </Button>
              {!isFormContext && (
                <Button 
                  size="sm"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
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