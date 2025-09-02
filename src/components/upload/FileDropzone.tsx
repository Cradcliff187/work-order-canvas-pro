import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
  children?: React.ReactNode;
  isUploading?: boolean;
  uploadStatusText?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  disabled = false,
  acceptedTypes = [],
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  className,
  children,
  isUploading = false,
  uploadStatusText = "Processing files..."
}) => {
  const isMobile = useIsMobile();

  // Desktop drag-and-drop setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFilesSelected,
    disabled: disabled || isMobile,
    accept: acceptedTypes.length > 0 ? Object.fromEntries(acceptedTypes.map(type => [type, []])) : undefined,
    multiple: maxFiles > 1
  });

  // Mobile devices don't support drag and drop well, so we skip the dropzone
  if (isMobile) {
    return null;
  }

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={isDragActive ? "Drop files to upload" : `Click to upload files or drag and drop. Maximum ${maxFiles} files allowed, ${Math.round(maxSizeBytes / 1024 / 1024)}MB each.`}
      aria-describedby="upload-zone-instructions"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
          input?.click();
        }
      }}
    >
      <CardContent className="p-8 text-center">
        <input {...getInputProps()} aria-hidden="true" />
        {children ? (
          children
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">
              {isDragActive ? "Drop files here" : "Drag & drop files here"}
            </h3>
            <p id="upload-zone-instructions" className="text-muted-foreground mb-4">
              or click to browse files
            </p>
            <Button 
              variant="outline" 
              type="button" 
              disabled={disabled || isUploading}
              aria-label={isUploading ? "Processing files, please wait" : "Browse and select files to upload"}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  {uploadStatusText}
                </>
              ) : (
                "Browse Files"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};