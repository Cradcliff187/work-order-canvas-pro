import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { isValidFileSize, isSupportedImageType, compressImage } from "@/utils/imageCompression";
import { formatFileSize } from "@/utils/fileUtils";
import { getCameraAttribute } from "@/utils/mobileDetection";
import { getErrorForToast } from '@/components/receipts/ErrorDisplay';
import { useAnalytics } from "@/utils/analytics";
import { 
  Sparkles, 
  Camera, 
  Upload, 
  FileText, 
  HelpCircle
} from "lucide-react";

interface FileUploadSectionProps {
  onFileSelect: (file: File, preview?: string) => void;
  onCameraCapture: () => void;
  cameraSupported: boolean;
  isProcessingLocked: boolean;
  hasFile: boolean;
  maxFileSize?: number;
  hasCompletedTour?: boolean;
  onStartTour?: () => void;
  dataTour?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadSection({
  onFileSelect,
  onCameraCapture,
  cameraSupported,
  isProcessingLocked,
  hasFile,
  maxFileSize = MAX_FILE_SIZE,
  hasCompletedTour,
  onStartTour,
  dataTour = "upload-section"
}: FileUploadSectionProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { trackImageCompression } = useAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (!isValidFileSize(file, maxFileSize)) {
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${formatFileSize(maxFileSize)}`,
        variant: 'destructive',
      });
      return;
    }

    if (!isSupportedImageType(file) && file.type !== 'application/pdf') {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload an image (JPEG, PNG, WebP, HEIC) or PDF file',
        variant: 'destructive',
      });
      return;
    }

    // For images, compress before processing
    if (file.type.startsWith('image/')) {
      try {
        const compressionStartTime = Date.now();
        const compressionResult = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8
        });

        const compressedFile = compressionResult.file;
        const compressionTime = Date.now() - compressionStartTime;
        
        // Track compression performance
        trackImageCompression(file.size, compressedFile.size, compressionTime);
        
        // Show compression results
        if (compressionResult.compressionRatio > 1.1) {
          toast({
            title: 'Image Optimized',
            description: `Reduced size by ${Math.round((1 - 1/compressionResult.compressionRatio) * 100)}%`,
          });
        }

        // Create image preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          onFileSelect(compressedFile, preview);
        };
        reader.readAsDataURL(compressedFile);

      } catch (error: any) {
        console.error('Image compression error:', error);
        const toastError = getErrorForToast(error);
        toast({
          title: toastError.title,
          description: toastError.description,
          variant: toastError.variant,
        });
        
        // Fall back to original file if compression fails
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          onFileSelect(file, preview);
        };
        reader.readAsDataURL(file);
      }
    } else {
      // For PDFs, no preview but still process
      onFileSelect(file);
    }
  }, [toast, onFileSelect, maxFileSize]);

  if (hasFile) {
    return null; // Don't render when file is already selected
  }

  return (
    <Card data-tour={dataTour}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Receipt Capture
          </div>
          {hasCompletedTour && onStartTour && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onStartTour}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Restart tutorial</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* Mobile-optimized capture buttons */}
          {isMobile ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-20 flex-col min-h-[80px]"
                onClick={cameraSupported ? onCameraCapture : () => cameraInputRef.current?.click()}
                disabled={isProcessingLocked}
              >
                <Camera className="h-6 w-6 mb-2" />
                <span className="text-sm">
                  {cameraSupported ? "Camera Preview" : "Camera"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-20 flex-col min-h-[80px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 mb-2" />
                <span className="text-sm">Upload</span>
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium mb-2">Upload Receipt or Invoice</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop or click to select files
                </p>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Supports images (JPEG, PNG, WebP, HEIC) and PDF files up to {formatFileSize(maxFileSize)}
          </p>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture={getCameraAttribute() === 'camera' ? 'user' : getCameraAttribute() === 'environment' ? 'environment' : undefined}
          onChange={handleFileSelect}
        />
      </CardContent>
    </Card>
  );
}