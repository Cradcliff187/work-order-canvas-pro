import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadProgress {
  [fileName: string]: {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
  };
}

interface StagedFile {
  file: File;
  id: string;
  uploadState: 'staged' | 'uploading' | 'completed' | 'error';
}

interface UploadProgressIndicatorProps {
  files: StagedFile[];
  uploadProgress: UploadProgress;
  className?: string;
}

export function UploadProgressIndicator({
  files,
  uploadProgress,
  className
}: UploadProgressIndicatorProps) {
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  // Calculate overall upload statistics
  const getUploadStats = () => {
    const uploadingFiles = files.filter(f => uploadProgress[f.file.name]?.status === 'uploading');
    const completedFiles = files.filter(f => uploadProgress[f.file.name]?.status === 'completed');
    const errorFiles = files.filter(f => uploadProgress[f.file.name]?.status === 'error');
    
    return {
      total: files.length,
      uploading: uploadingFiles.length,
      completed: completedFiles.length,
      errors: errorFiles.length
    };
  };

  const stats = getUploadStats();

  // Update status announcement for screen readers
  useEffect(() => {
    let announcement = '';
    
    if (stats.uploading > 0) {
      announcement = `Uploading ${stats.uploading} of ${stats.total} files`;
    } else if (stats.errors > 0) {
      announcement = `${stats.errors} files failed to upload`;
    } else if (stats.completed === stats.total && stats.total > 0) {
      announcement = `All ${stats.completed} files uploaded successfully`;
    }
    
    setStatusAnnouncement(announcement);
  }, [stats.uploading, stats.completed, stats.errors, stats.total]);

  // Don't render if no files or no active uploads
  if (files.length === 0 || (stats.uploading === 0 && stats.completed === 0 && stats.errors === 0)) {
    return null;
  }

  // Calculate overall progress
  const getOverallProgress = () => {
    if (files.length === 0) return 0;
    
    const totalProgress = files.reduce((acc, file) => {
      const fileProgress = uploadProgress[file.file.name];
      return acc + (fileProgress?.progress || 0);
    }, 0);
    
    return Math.round(totalProgress / files.length);
  };

  const overallProgress = getOverallProgress();
  const hasErrors = stats.errors > 0;
  const isCompleted = stats.completed === stats.total;
  const isUploading = stats.uploading > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Live region for status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

      {/* Overall progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isUploading && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {isCompleted && !hasErrors && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {hasErrors && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            
            <span className="font-medium">
              {isUploading && `Uploading files...`}
              {isCompleted && !hasErrors && `Upload complete`}
              {hasErrors && `Upload issues`}
            </span>
          </div>
          
          <span className="text-muted-foreground">
            {stats.completed}/{stats.total}
          </span>
        </div>

        {/* Progress bar */}
        {(isUploading || isCompleted) && (
          <Progress 
            value={overallProgress} 
            className={cn(
              "h-2 transition-all duration-300",
              hasErrors && "bg-destructive/10"
            )}
          />
        )}

        {/* Status summary */}
        <div className="text-xs text-muted-foreground">
          {isUploading && (
            <span>
              {stats.uploading} uploading
              {stats.completed > 0 && `, ${stats.completed} completed`}
              {stats.errors > 0 && `, ${stats.errors} failed`}
            </span>
          )}
          {isCompleted && !hasErrors && (
            <span>All files uploaded successfully</span>
          )}
          {hasErrors && (
            <span className="text-destructive">
              {stats.errors} file{stats.errors === 1 ? '' : 's'} failed to upload
            </span>
          )}
        </div>
      </div>
    </div>
  );
}