import React from 'react';
import { X, FileText, File, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FilePreviewItem {
  file: File;
  id: string;
  previewUrl?: string;
  fileType: 'image' | 'document';
  uploadState?: 'staged' | 'uploading' | 'completed' | 'error';
}

interface UploadProgress {
  [fileName: string]: {
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
  };
}

interface FilePreviewListProps {
  files: FilePreviewItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  uploadProgress?: UploadProgress;
  className?: string;
  layout?: 'mobile' | 'desktop';
  mode?: 'immediate' | 'staged';
  onUploadRequested?: (files: File[]) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export function FilePreviewList({
  files,
  onRemove,
  onClear,
  uploadProgress = {},
  className,
  layout = 'desktop',
  mode = 'immediate',
  onUploadRequested,
  isUploading = false,
  disabled = false
}: FilePreviewListProps) {
  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName] || { progress: 0, status: 'pending' as const };
  };

  if (files.length === 0) return null;

  // Mobile Layout
  if (layout === 'mobile') {
    return (
      <div className={cn("space-y-2", className)} role="region" aria-label="Selected files" aria-describedby="file-count">
        <div className="flex justify-between items-center">
          <p id="file-count" className="text-sm font-medium">Selected Files ({files.length})</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClear}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 min-w-[44px]"
            aria-label={`Clear all ${files.length} selected files`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-4" role="list" aria-label="File list">
          {files.map((preview) => {
            const progress = getFileProgress(preview.file.name);
            const progressId = `progress-${preview.id}`;
            const uploadState = preview.uploadState || 'staged';
            const isCurrentlyUploading = uploadState === 'uploading';
            
            return (
              <Card key={preview.id} role="listitem" className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* File preview */}
                    <div role="img" aria-label={`${preview.fileType} file preview`}>
                      {preview.fileType === 'image' && preview.previewUrl ? (
                        <img
                          src={preview.previewUrl}
                          alt={`Preview of ${preview.file.name}`}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* File info and actions */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={preview.file.name}>
                            {preview.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(preview.id)}
                          disabled={isCurrentlyUploading}
                          className={cn(
                            "h-11 w-11 p-0 flex-shrink-0",
                            isCurrentlyUploading 
                              ? "text-muted-foreground cursor-not-allowed" 
                              : "text-destructive hover:text-destructive hover:bg-destructive/10"
                          )}
                          aria-label={isCurrentlyUploading ? `Cannot remove ${preview.file.name} while uploading` : `Remove ${preview.file.name}`}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Progress and upload state */}
                      {uploadState !== 'staged' && (
                        <div className="space-y-2" aria-describedby={progressId}>
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn(
                              "font-medium",
                              uploadState === 'uploading' && "text-primary",
                              uploadState === 'completed' && "text-emerald-600",
                              uploadState === 'error' && "text-destructive"
                            )} id={progressId}>
                              {uploadState === 'uploading' && `Uploading...`}
                              {uploadState === 'completed' && 'Upload complete'}
                              {uploadState === 'error' && 'Upload failed'}
                            </span>
                            {uploadState === 'uploading' && (
                              <span className="font-medium text-primary">{progress.progress}%</span>
                            )}
                          </div>
                          {uploadState === 'uploading' && (
                            <Progress 
                              value={progress.progress} 
                              className="h-2"
                              aria-label={`Upload progress: ${progress.progress}%`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upload trigger for staged mode */}
        {mode === 'staged' && files.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button
                onClick={() => {
                  const allFiles = files.map(f => f.file);
                  onUploadRequested?.(allFiles);
                }}
                disabled={disabled || isUploading || files.length === 0}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading {files.length} file{files.length === 1 ? '' : 's'}...
                  </>
                ) : (
                  `Upload ${files.length} file${files.length === 1 ? '' : 's'}`
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={cn("space-y-4", className)} role="region" aria-label="Selected files" aria-describedby="desktop-file-count">
      <div className="flex justify-between items-center">
        <h4 id="desktop-file-count" className="font-medium">Selected Files ({files.length})</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClear}
          aria-label={`Clear all ${files.length} selected files`}
        >
          Clear All
        </Button>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="File grid">
        {files.map((preview) => {
          const progress = getFileProgress(preview.file.name);
          const progressId = `desktop-progress-${preview.id}`;
          const uploadState = preview.uploadState || 'staged';
          const isCurrentlyUploading = uploadState === 'uploading';
          
          return (
            <Card key={preview.id} role="listitem">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* File preview */}
                  <div 
                    className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden"
                    role="img" 
                    aria-label={`${preview.fileType} file preview`}
                  >
                    {preview.fileType === 'image' && preview.previewUrl ? (
                      <img
                        src={preview.previewUrl}
                        alt={`Preview of ${preview.file.name}`}
                        className="w-full h-full object-cover"
                      />
                     ) : (
                       <File className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                     )}
                  </div>

                  {/* File details */}
                  <div>
                    <p className="font-medium text-sm truncate" title={preview.file.name}>
                      {preview.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground" aria-label={`File size: ${(preview.file.size / 1024 / 1024).toFixed(2)} megabytes`}>
                      {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                   {/* Progress and upload state */}
                   {uploadState !== 'staged' && (
                     <div className="space-y-1" role="group" aria-labelledby={progressId}>
                       {uploadState === 'uploading' && (
                         <Progress 
                           value={progress.progress} 
                           className="h-3" 
                           aria-label={`Upload progress for ${preview.file.name}: ${progress.progress}%`}
                         />
                       )}
                       <p id={progressId} className={cn(
                         "text-xs font-medium",
                         uploadState === 'uploading' && "text-primary",
                         uploadState === 'completed' && "text-emerald-600", 
                         uploadState === 'error' && "text-destructive"
                       )} aria-live="polite">
                         {uploadState === 'uploading' 
                           ? `Uploading: ${progress.progress}%`
                           : uploadState === 'completed'
                           ? 'Upload complete'
                           : uploadState === 'error'
                           ? 'Upload failed'
                           : 'Ready to upload'
                         }
                       </p>
                     </div>
                   )}

                   {/* Remove button */}
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full"
                     onClick={() => onRemove(preview.id)}
                     disabled={isCurrentlyUploading}
                     aria-label={isCurrentlyUploading ? `Cannot remove ${preview.file.name} while uploading` : `Remove ${preview.file.name} from upload queue`}
                   >
                     <X className="w-4 h-4 mr-1" aria-hidden="true" />
                     {isCurrentlyUploading ? 'Uploading...' : 'Remove'}
                   </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload trigger for staged mode */}
      {mode === 'staged' && (
        <Card>
          <CardContent className="p-4">
            <Button
              onClick={() => {
                const allFiles = files.map(f => f.file);
                onUploadRequested?.(allFiles);
              }}
              disabled={disabled || isUploading || files.length === 0}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading {files.length} file{files.length === 1 ? '' : 's'}...
                </>
              ) : (
                `Upload ${files.length} file${files.length === 1 ? '' : 's'}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}