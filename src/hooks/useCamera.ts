import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

import { isIOS, isAndroid, isMobileBrowser } from "@/utils/mobileDetection";

export interface CameraCapabilities {
  hasCamera: boolean;
  hasMultipleCameras: boolean;
  supportsImageCapture: boolean;
}

export function useCamera() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const { toast } = useToast();

  const checkCameraSupport = useCallback(async () => {
    try {
      const hasUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      if (!hasUserMedia) {
        setIsSupported(false);
        return false;
      }

      // Check for camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const capabilities: CameraCapabilities = {
        hasCamera: videoDevices.length > 0,
        hasMultipleCameras: videoDevices.length > 1,
        supportsImageCapture: 'ImageCapture' in window
      };

      setCapabilities(capabilities);
      setIsSupported(capabilities.hasCamera);
      
      return capabilities.hasCamera;
    } catch (error) {
      console.error('Camera support check failed:', error);
      setIsSupported(false);
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    // First check if getUserMedia is available
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.error('Camera permission denied:', error);
        
        // If getUserMedia fails on mobile, fallback to native file input
        if (isMobileBrowser()) {
          // On mobile, file input with capture is a valid alternative
          return true;
        }
        
        // On desktop, show permission error
        toast({
          title: "Camera Permission Required",
          description: "Please allow camera access to take photos for work reports.",
          variant: "destructive"
        });
        return false;
      }
    } else {
      // No getUserMedia support - use file input fallback on mobile
      if (isMobileBrowser()) {
        return true; // File input with capture works on mobile
      }
      
      toast({
        title: "Camera Not Supported",
        description: "Your browser doesn't support camera access.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const captureImageFromCamera = useCallback(async (
    facingMode: 'user' | 'environment' = 'environment',
    quality: number = 0.8
  ): Promise<File | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.srcObject = stream;
        video.play();

        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          setTimeout(() => {
            if (context) {
              context.drawImage(video, 0, 0);
              
              canvas.toBlob((blob) => {
                stream.getTracks().forEach(track => track.stop());
                
                if (blob) {
                  const file = new File([blob], `photo-${Date.now()}.jpg`, {
                    type: 'image/jpeg'
                  });
                  resolve(file);
                } else {
                  resolve(null);
                }
              }, 'image/jpeg', quality);
            } else {
              stream.getTracks().forEach(track => track.stop());
              resolve(null);
            }
          }, 100);
        });
      });
    } catch (error) {
      console.error('Image capture failed:', error);
      toast({
        title: "Capture Failed",
        description: "Unable to capture image. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  const compressImage = useCallback(async (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  return {
    isSupported,
    capabilities,
    checkCameraSupport,
    requestCameraPermission,
    captureImageFromCamera,
    compressImage
  };
}