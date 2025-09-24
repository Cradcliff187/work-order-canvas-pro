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

/**
 * UniversalUploadSheet - Mobile-optimized sheet-based file selection
 * 
 * Ideal for:
 * - Mobile uploads requiring camera/gallery access
 * - Modal contexts where space is limited
 * - Camera/scanner integration workflows
 * 
 * Features:
 * - Native camera and gallery integration
 * - Mobile-first responsive design
 * - Various input method options (camera, scanner, gallery, files)
 * - Haptic feedback on mobile devices
 */
interface UniversalUploadSheetProps {
  trigger?: React.ReactNode;
  
  /**
   * Upload mode controls the file handling behavior:
   * - 'immediate': Files are sent to parent immediately on selection (legacy behavior)
   * - 'staged': Files are held internally until explicit upload action (new behavior)
   * @default 'immediate' for backward compatibility
   */
  mode?: 'immediate' | 'staged';
  
  /**
   * How to handle multiple file selections:
   * - 'replace': New files replace all previous selections (default, predictable behavior)
   * - 'accumulate': New files add to existing selection
   * @default 'replace' for predictable behavior
   */
  selectionMode?: 'accumulate' | 'replace';
  
  /**
   * Called immediately when files are selected in 'immediate' mode
   * Not called in 'staged' mode. Always receives the FULL file list.
   */
  onFilesSelected?: (files: File[]) => void;
  
  /**
   * Called when files are selected and staged (only in 'staged' mode)
   * Always receives the FULL file list.
   */
  onFilesStaged?: (files: File[]) => void;
  
  /**
   * Called when user explicitly requests upload (only in 'staged' mode)
   * Always receives the FULL file list.
   */
  onUploadRequested?: (files: File[]) => void;
  
  // File constraints - consistent with other upload components
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  
  // Legacy props for backward compatibility
  accept?: string;
  multiple?: boolean;
  
  // Control props
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // State props
  isProcessing?: boolean;
  uploadProgress?: { [fileName: string]: { progress: number; status: 'pending' | 'uploading' | 'completed' | 'error' } };
  selectedFileCount?: number;
  
  // UI customization
  buttonText?: string;
  context?: 'work-order' | 'general' | 'invoice' | 'report';
}

export function UniversalUploadSheet({
  trigger,
  mode = 'immediate', // Default to immediate for backward compatibility
  selectionMode = 'replace', // Default to replace for predictable behavior
  onFilesSelected,
  onFilesStaged,
  onUploadRequested,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  acceptedTypes = [],
  accept = "*/*", // Legacy prop
  multiple = true, // Legacy prop
  disabled = false,
  open,
  onOpenChange,
  isProcessing = false,
  uploadProgress = {},
  selectedFileCount = 0,
  buttonText,
  context = 'general'
}: UniversalUploadSheetProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successFileCount, setSuccessFileCount] = useState(0);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  
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
    const newFiles = Array.from(event.target.files || []);
    if (newFiles.length > 0) {
      // Enhanced haptic feedback on mobile
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate([50, 25, 100]); // Success pattern
      }
      
      // Apply selection mode logic
      const allFiles = selectionMode === 'accumulate' 
        ? [...stagedFiles, ...newFiles]
        : [...newFiles];
      
      // Update internal state for both modes
      setStagedFiles(allFiles);
      
      // Show success state with animation
      setSuccessFileCount(allFiles.length);
      setShowSuccess(true);
      
      // Call appropriate handler based on mode - always send FULL file list
      if (mode === 'immediate') {
        onFilesSelected?.(allFiles);
      } else {
        onFilesStaged?.(allFiles);
      }
      
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
      // Light haptic feedback on tap
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
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
          "upload-option-card cursor-pointer min-h-[120px]",
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
              "mx-auto rounded-full flex items-center justify-center",
              isMobile ? "w-16 h-16" : "w-12 h-12",
              (isProcessing || showSuccess) 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary/10 text-primary"
            )} aria-hidden="true">
              {isProcessing ? (
                <Loader2 className={cn("animate-spin", isMobile ? "w-8 h-8" : "w-6 h-6")} />
              ) : showSuccess ? (
                <CheckCircle2 className={cn(isMobile ? "w-8 h-8" : "w-6 h-6")} />
              ) : (
                <option.icon className={cn("upload-icon-bounce upload-option-icon", isMobile ? "w-8 h-8" : "w-6 h-6")} />
              )}
            </div>
          <div>
            <h3 className={cn("font-medium leading-tight upload-option-title", 
              isMobile ? "text-lg" : "text-sm"
            )}>
              {isProcessing ? "Processing..." : showSuccess ? "Selected!" : option.title}
            </h3>
            <p id={`${option.id}-description`} className={cn("text-muted-foreground mt-1 leading-tight upload-option-description",
              isMobile ? "text-base" : "text-xs"
            )}>
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
      className={cn(
        "upload-trigger-enhanced w-full h-20 border-dashed border-2",
        isProcessing && "processing"
      )}
      disabled={disabled || isProcessing}
      aria-label={isProcessing ? "Processing files, please wait" : `Open file selection dialog. ${selectedFileCount > 0 ? `${selectedFileCount} file${selectedFileCount !== 1 ? 's' : ''} currently selected.` : 'No files selected.'}`}
      aria-describedby="upload-trigger-description"
    >
      <div className="text-center">
        {isProcessing ? (
          <Loader2 className="h-6 w-6 mx-auto mb-2 text-primary animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="upload-icon-bounce h-6 w-6 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
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
          aria-labelledby="upload-sheet-title"
          aria-describedby="upload-sheet-description"
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
                  <div className="space-y-2">
                    <div className="font-medium">File requirements:</div>
                    <div>Formats: {acceptedTypes.length > 0 
                      ? acceptedTypes.map(t => t.split('/')[1]?.toUpperCase()).join(', ')
                      : 'Images and documents supported'
                    }</div>
                    <div>Max size: {Math.round(maxSizeBytes / 1024 / 1024)}MB per file</div>
                    <div>Max files: {maxFiles}</div>
                    {mode === 'staged' && stagedFiles.length > 0 && (
                      <div className="text-primary font-medium">
                        {selectionMode === 'accumulate' 
                          ? `Adding to ${stagedFiles.length} existing files` 
                          : 'New selection will replace existing files'
                        }
                      </div>
                    )}
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