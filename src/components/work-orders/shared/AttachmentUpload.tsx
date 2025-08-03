import React, { useState, useCallback } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  Upload,
  X,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileUpload } from '@/components/FileUpload';
import { MobileFileUpload } from '@/components/MobileFileUpload';
import { formatFileSize } from '@/utils/imageCompression';
import { ALL_SUPPORTED_TYPES, getSupportedFormatsText } from '@/utils/fileTypeUtils';
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
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  isUploading = false,
  uploadProgress = [],
  disabled = false,
  className
}: AttachmentUploadProps) {
  const isMobile = useIsMobile();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Handle file selection
  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
      setIsSheetOpen(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [selectedFiles, onUpload]);

  // Clear selected files
  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // Calculate total upload progress
  const totalProgress = uploadProgress.length > 0 
    ? Math.round(uploadProgress.reduce((sum, p) => sum + p.progress, 0) / uploadProgress.length)
    : 0;

  // Desktop upload interface
  const DesktopUpload = () => (
    <div className={cn("space-y-4", className)}>
      <FileUpload
        onFilesSelected={handleFilesSelected}
        maxFiles={maxFiles}
        maxSizeBytes={maxFileSize}
        uploadProgress={uploadProgress}
        disabled={disabled || isUploading}
        acceptedTypes={['*/*']} // Accept all file types
      />
      
      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </span>
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
      )}
      
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

  // Mobile upload interface with bottom sheet
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
        
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Add Attachments</SheetTitle>
            <SheetDescription>
              Choose how you'd like to add files. Supports {getSupportedFormatsText()}.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <MobileFileUpload
              onFilesSelected={handleFilesSelected}
              maxFiles={maxFiles}
              maxSizeBytes={maxFileSize}
              uploadProgress={uploadProgress}
              disabled={disabled || isUploading}
              acceptedTypes={['*/*']} // Accept all file types
              showCameraButton={true}
              showGalleryButton={true}
              showDocumentButton={true}
            />
            
            {selectedFiles.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready
                </span>
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
            )}
            
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

  // File format info
  const FileFormatInfo = () => (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="text-center space-y-2">
          <div className="flex justify-center gap-2">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
            <FileText className="w-5 h-5 text-muted-foreground" />
            <Camera className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Supports all file types
          </p>
          <p className="text-xs text-muted-foreground">
            Max {formatFileSize(maxFileSize)} per file • Up to {maxFiles} files
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {isMobile ? <MobileUpload /> : <DesktopUpload />}
      
      {!isUploading && selectedFiles.length === 0 && (
        <FileFormatInfo />
      )}
    </div>
  );
}