import React from 'react';
import { X, File, ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StagedFile {
  file: File;
  id: string;
  previewUrl?: string;
  fileType: 'image' | 'document';
  stage: 'selecting' | 'staged' | 'uploading' | 'completed' | 'error';
  uploadState: 'staged' | 'uploading' | 'completed' | 'error';
}

interface UploadProgress {
  [fileName: string]: {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
  };
}

interface StagedFilesListProps {
  files: StagedFile[];
  uploadProgress: UploadProgress;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
  isMobile?: boolean;
}

export function StagedFilesList({
  files,
  uploadProgress,
  onRemoveFile,
  onClearAll,
  disabled = false,
  isMobile = false
}: StagedFilesListProps) {
  
  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName] || { progress: 0, status: 'pending' as const };
  };

  const getStatusIcon = (file: StagedFile) => {
    const progress = getFileProgress(file.file.name);
    
    switch (progress.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const canRemoveFile = (file: StagedFile): boolean => {
    return !disabled && file.uploadState !== 'uploading';
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Files list */}
      <div className="space-y-2">
        {files.map((file) => {
          const progress = getFileProgress(file.file.name);
          const isUploading = progress.status === 'uploading';
          const isCompleted = progress.status === 'completed';
          const hasError = progress.status === 'error';
          
          return (
            <Card key={file.id} className={cn(
              "relative overflow-hidden transition-all duration-200",
              isCompleted && "bg-green-50 border-green-200",
              hasError && "bg-destructive/5 border-destructive/20"
            )}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* File preview/icon */}
                  <div className="flex-shrink-0">
                    {file.fileType === 'image' && file.previewUrl ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={file.previewUrl}
                          alt={`Preview of ${file.file.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {file.fileType === 'image' ? (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <File className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* File details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.file.name}
                      </p>
                      {getStatusIcon(file)}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      
                      {/* Upload progress */}
                      {isUploading && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-primary">
                            {progress.progress}%
                          </span>
                        </>
                      )}
                      
                      {isCompleted && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-green-600">Uploaded</span>
                        </>
                      )}
                      
                      {hasError && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-destructive">Failed</span>
                        </>
                      )}
                    </div>

                    {/* Progress bar for uploading files */}
                    {isUploading && (
                      <div className="mt-2">
                        <Progress value={progress.progress} className="h-1" />
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  {canRemoveFile(file) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(file.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${file.file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Clear all button */}
      {files.length > 1 && !disabled && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}