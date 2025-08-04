import React, { useRef } from 'react';
import { Camera, Scan, FolderOpen, Image, Clock } from 'lucide-react';
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
  trigger: React.ReactNode;
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export function UniversalUploadSheet({
  trigger,
  onFilesSelected,
  accept = "*/*",
  multiple = true,
  disabled = false
}: UniversalUploadSheetProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  
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
      onFilesSelected(files);
      setIsOpen(false);
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

    return (
      <Card
        key={option.id}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
          "border-2 hover:border-primary/20"
        )}
        onClick={() => triggerFileInput(option.id)}
      >
        <CardContent className="p-4 text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <option.icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{option.title}</h3>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

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
          {...option.inputProps}
        />
      ))}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild disabled={disabled}>
          {trigger}
        </SheetTrigger>
        
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "p-0",
            isMobile ? "h-[85vh] rounded-t-lg" : "w-[400px] sm:w-[540px]"
          )}
        >
          {/* Mobile handle bar */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
          )}
          
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle>Upload Files</SheetTitle>
              <SheetDescription>
                Choose how you'd like to add your files
              </SheetDescription>
            </SheetHeader>

            <div className={cn(
              "grid gap-3",
              isMobile ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
            )}>
              {uploadOptions.map(renderOptionCard)}
            </div>

            {isMobile && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsOpen(false)}
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