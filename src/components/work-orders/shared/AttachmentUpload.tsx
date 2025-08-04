import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedFileUpload } from '@/components/upload/UnifiedFileUpload';
import { cn } from '@/lib/utils';
import type { UploadProgress } from '@/hooks/useFileUpload';

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hasFilesToUpload, setHasFilesToUpload] = useState(false);

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
      await onUpload(selectedFiles);
      setSelectedFiles([]);
      setHasFilesToUpload(false);
    }
  }, [selectedFiles, onUpload]);

  return (
    <div className={cn("space-y-4", className)}>
      <UnifiedFileUpload
        onFilesSelected={handleFilesSelected}
        maxFiles={maxFiles}
        maxSizeBytes={maxFileSize}
        uploadProgress={formattedProgress}
        disabled={disabled || isUploading}
      />
      
      {hasFilesToUpload && !isUploading && (
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
              }}
            >
              Clear
            </Button>
            <Button 
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}