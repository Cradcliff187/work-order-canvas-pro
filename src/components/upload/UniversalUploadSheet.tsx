import React, { useRef, useState, useEffect } from 'react';
import { Camera, Scan, FolderOpen, Image, Clock, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { supportsNativeCamera, getCameraAttribute } from '@/utils/mobileDetection';

interface UploadOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  inputProps: {
    accept?: string;
    capture?: boolean | "user" | "environment";
    multiple?: boolean;
  };
  available: boolean;
}

interface UniversalUploadSheetProps {
  trigger?: React.ReactNode;
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isProcessing?: boolean;
  selectedFileCount?: number;
  buttonText?: string;
  context?: 'work-order' | 'general' | 'invoice' | 'report';
}

export function UniversalUploadSheet({
  trigger,
  onFilesSelected,
  accept = "*/*",
  multiple = true,
  disabled = false,
  open,
  onOpenChange,
  isProcessing = false,
  selectedFileCount = 0,
  buttonText,
  context = 'general'
}: UniversalUploadSheetProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successFileCount, setSuccessFileCount] = useState(0);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  // File input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const uploadOptions: UploadOption[] = [
    {
      id: 'camera',
      title: 'Take Photo',
      description: 'Capture with camera',
      icon: Camera,
      inputProps: {
        accept: 'image/*',
        capture: getCameraAttribute() === 'camera' ? 'user' : 'environment',
        multiple: false
      },
      available: supportsNativeCamera()
    },
    {
      id: 'scanner',
      title: 'Scan Document',
      description: 'Enhanced document capture',
      icon: Scan,
      inputProps: {
        accept: 'image/*',
        capture: 'environment',
        multiple: false
      },
      available: supportsNativeCamera()
    },
    {
      id: 'gallery',
      title: 'Photo Library',
      description: 'Select from gallery',
      icon: Image,
      inputProps: {
        accept: 'image/*',
        multiple: true
      },
      available: true
    },
    {
      id: 'files',
      title: 'Browse Files',
      description: 'All file types',
      icon: FolderOpen,
      inputProps: {
        accept,
        multiple
      },
      available: true
    },
    {
      id: 'recent',
      title: 'Recent Uploads',
      description: 'Last 20 files',
      icon: Clock,
      inputProps: {},
      available: false // TODO: Implement recent files feature
    }
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Add haptic feedback on mobile
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      // Show success state with animation
      setSuccessFileCount(files.length);
      setShowSuccess(true);
      
      // Call the parent handler
      onFilesSelected(files);
      
      // Delay closing the sheet to show success confirmation
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
      }, 300);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const triggerFileInput = (optionId: string) => {
    const inputMap = {
      camera: cameraInputRef,
      scanner: scannerInputRef,
      gallery: galleryInputRef,
      files: filesInputRef,
    };
    
    const inputRef = inputMap[optionId as keyof typeof inputMap];
    if (inputRef?.current) {
      inputRef.current.click();
    }
  };

  const renderOptionCard = (option: UploadOption) => {
    if (!option.available) return null;

    const getOptionDescription = () => {
      switch (option.id) {
        case 'camera':
          return 'Capture photos directly with your device camera';
        case 'scanner':
          return 'Enhanced document scanning with automatic edge detection';
        case 'gallery':
          return 'Select existing photos from your device gallery';
        case 'files':
          return 'Browse and select any file type from your device';
        default:
          return option.description;
      }
    };

    return (
      <Card
        key={option.id}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95",
          "border-2 hover:border-primary/50 min-h-[120px]",
          !option.available && "opacity-50 cursor-not-allowed",
          (isProcessing || showSuccess) && "border-primary bg-primary/5"
        )}
        onClick={() => !isProcessing && !showSuccess && option.available && triggerFileInput(option.id)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isProcessing && !showSuccess && option.available) {
            e.preventDefault();
            triggerFileInput(option.id);
          }
        }}
        tabIndex={isProcessing || showSuccess || !option.available ? -1 : 0}
        role="button"
        aria-label={isProcessing ? "Processing files" : showSuccess ? `${successFileCount} file${successFileCount !== 1 ? 's' : ''} selected successfully` : `${option.title}: ${getOptionDescription()}`}
        aria-describedby={`${option.id}-description`}
      >
        <CardContent className="p-4 text-center space-y-3 h-full flex flex-col justify-center">
          <div className={cn(
            "mx-auto w-12 h-12 rounded-full flex items-center justify-center",
            (isProcessing || showSuccess) 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/10 text-primary"
          )} aria-hidden="true">
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : showSuccess ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <option.icon className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm leading-tight">
              {isProcessing ? "Processing..." : showSuccess ? "Selected!" : option.title}
            </h3>
            <p id={`${option.id}-description`} className="text-xs text-muted-foreground mt-1 leading-tight">
              {showSuccess 
                ? `${successFileCount} file${successFileCount !== 1 ? 's' : ''} selected` 
                : option.description || getOptionDescription()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Get context-aware description
  const getSheetDescription = () => {
    switch (context) {
      case 'work-order':
        return "Select files to attach to your work order";
      case 'invoice':
        return "Select invoice or receipt files to upload";
      case 'report':
        return "Select files to attach to your report";
      default:
        return "Choose how you'd like to add your files";
    }
  };

  // Default trigger button if none provided
  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      className="w-full h-20 border-dashed border-2 hover:border-primary/50 transition-colors duration-200"
      disabled={disabled || isProcessing}
      aria-label={isProcessing ? "Processing files, please wait" : `Open file selection dialog. ${selectedFileCount > 0 ? `${selectedFileCount} file${selectedFileCount !== 1 ? 's' : ''} currently selected.` : 'No files selected.'}`}
      aria-describedby="upload-trigger-description"
    >
      <div className="text-center">
        {isProcessing ? (
          <Loader2 className="h-6 w-6 mx-auto mb-2 text-primary animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
        )}
        <p className="text-sm font-medium">
          {isProcessing ? "Processing..." : (buttonText || (selectedFileCount > 0 ? `${selectedFileCount} file${selectedFileCount !== 1 ? 's' : ''} selected` : "Select Files"))}
        </p>
        <p id="upload-trigger-description" className="text-xs text-muted-foreground">
          {isProcessing ? "Please wait..." : "Click to select files"}
        </p>
      </div>
    </Button>
  );

  return (
    <>
      {/* Hidden file inputs */}
      {uploadOptions.map((option) => (
        <input
          key={option.id}
          ref={
            option.id === 'camera' ? cameraInputRef :
            option.id === 'scanner' ? scannerInputRef :
            option.id === 'gallery' ? galleryInputRef :
            option.id === 'files' ? filesInputRef :
            undefined
          }
          type="file"
          className="hidden"
          onChange={handleFileChange}
          aria-label={`${option.title} file input`}
          aria-describedby={`${option.id}-description`}
          {...option.inputProps}
        />
      ))}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild disabled={disabled || isProcessing}>
          {trigger || defaultTrigger}
        </SheetTrigger>
        
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "p-0",
            isMobile ? "h-[85vh] rounded-t-lg" : "w-[400px] sm:w-[540px]"
          )}
          role="dialog"
          aria-label="File upload options"
        >
          {/* Mobile handle bar */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
              <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
          )}
          
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle id="upload-sheet-title" className="text-lg">
                {showSuccess ? "Files Selected!" : "Choose Upload Method"}
              </SheetTitle>
              <SheetDescription id="upload-sheet-description" className="text-sm">
                {showSuccess ? `${successFileCount} file${successFileCount !== 1 ? 's' : ''} ready for upload` : getSheetDescription()}
              </SheetDescription>
              
              {/* File restrictions display */}
              {!showSuccess && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border mt-4">
                  <div className="space-y-1">
                    <div className="font-medium">File requirements:</div>
                    <div>Images and documents supported</div>
                    <div>Max size: 10 MB per file</div>
                  </div>
                </div>
              )}
            </SheetHeader>

            {/* Live region for status updates */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {showSuccess ? `${successFileCount} file${successFileCount !== 1 ? 's' : ''} selected successfully` : ''}
            </div>

            <div 
              className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
              )}
              role="group"
              aria-labelledby="upload-sheet-title"
              aria-describedby="upload-sheet-description"
            >
              {uploadOptions.map(renderOptionCard)}
            </div>

            {isMobile && (
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => setIsOpen(false)}
                aria-label="Cancel file selection and close dialog"
              >
                Cancel
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}