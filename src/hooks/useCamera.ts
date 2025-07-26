import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

import { isIOS, isAndroid, isMobileBrowser, getPlatformName } from "@/utils/mobileDetection";

export interface CameraCapabilities {
  hasCamera: boolean;
  hasMultipleCameras: boolean;
  supportsImageCapture: boolean;
}

export interface DebugInfo {
  platform: string;
  userAgent: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  capabilities: CameraCapabilities | null;
  permissionState: CameraPermissionState | null;
  deviceCount: number;
  errors: Array<{ timestamp: string; error: string; context: string }>;
}

interface CameraPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: 'denied' | 'unavailable' | 'not_supported';
}

export function useCamera() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [errors, setErrors] = useState<Array<{ timestamp: string; error: string; context: string }>>([]);
  const { toast } = useToast();

  const logError = useCallback((error: string, context: string) => {
    const timestamp = new Date().toISOString();
    const errorEntry = { timestamp, error, context };
    
    if (debugMode) {
      console.error(`[Camera:${context}]`, error, { timestamp });
    }
    
    setErrors(prev => [...prev.slice(-9), errorEntry]); // Keep last 10 errors
  }, [debugMode]);

  const logInfo = useCallback((message: string, context: string, data?: any) => {
    if (debugMode) {
      console.info(`[Camera:${context}]`, message, data || '');
    }
  }, [debugMode]);

  const collectDebugInfo = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      const info: DebugInfo = {
        platform: getPlatformName(),
        userAgent: navigator.userAgent,
        isMobile: isMobileBrowser(),
        isIOS: isIOS(),
        isAndroid: isAndroid(),
        capabilities,
        permissionState: null, // Will be updated later to avoid circular dependency
        deviceCount: videoDevices.length,
        errors: errors.slice()
      };
      
      setDebugInfo(info);
      logInfo('Debug info collected', 'Debug', info);
      return info;
    } catch (error) {
      logError(`Debug info collection failed: ${error}`, 'Debug');
      return null;
    }
  }, [capabilities, errors, logError, logInfo]);

  const enableDebug = useCallback(() => {
    // Only allow debug mode in development
    if (import.meta.env.MODE === 'development') {
      setDebugMode(true);
      collectDebugInfo();
      console.info('[Camera:Debug] Debug mode enabled');
    }
  }, [collectDebugInfo]);

  const disableDebug = useCallback(() => {
    setDebugMode(false);
    console.info('[Camera:Debug] Debug mode disabled');
  }, []);

  const checkCameraSupport = useCallback(async () => {
    try {
      logInfo('Starting camera support check', 'Support');
      
      const hasUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      logInfo(`getUserMedia support: ${hasUserMedia}`, 'Support');
      
      if (!hasUserMedia) {
        logError('getUserMedia not supported', 'Support');
        setIsSupported(false);
        return false;
      }

      // Check for camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      logInfo(`Found ${videoDevices.length} video devices`, 'Support', { devices: videoDevices.length });
      
      const capabilities: CameraCapabilities = {
        hasCamera: videoDevices.length > 0,
        hasMultipleCameras: videoDevices.length > 1,
        supportsImageCapture: 'ImageCapture' in window
      };

      logInfo('Camera capabilities assessed', 'Support', capabilities);
      setCapabilities(capabilities);
      setIsSupported(capabilities.hasCamera);
      
      if (debugMode) {
        collectDebugInfo();
      }
      
      return capabilities.hasCamera;
    } catch (error) {
      const errorMsg = `Camera support check failed: ${error}`;
      logError(errorMsg, 'Support');
      setIsSupported(false);
      return false;
    }
  }, [logInfo, logError, debugMode, collectDebugInfo]);

  const checkCameraPermission = useCallback(async (): Promise<CameraPermissionState> => {
    try {
      logInfo('Checking camera permission', 'Permission');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const result = { granted: false, denied: true, prompt: false, error: 'not_supported' as const };
        logError('getUserMedia not supported', 'Permission');
        return result;
      }

      // Check permission API if available
      if ('permissions' in navigator) {
        try {
          logInfo('Using Permissions API', 'Permission');
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          logInfo(`Permission API result: ${permission.state}`, 'Permission');
          
          if (permission.state === 'granted') {
            return { granted: true, denied: false, prompt: false };
          } else if (permission.state === 'denied') {
            return { granted: false, denied: true, prompt: false, error: 'denied' };
          } else {
            return { granted: false, denied: false, prompt: true };
          }
        } catch (error) {
          logInfo('Permissions API not fully supported, falling back to getUserMedia test', 'Permission');
        }
      } else {
        logInfo('Permissions API not available, using getUserMedia test', 'Permission');
      }

      // For mobile or browsers without permission API, try getUserMedia
      try {
        logInfo('Testing getUserMedia access', 'Permission');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        stream.getTracks().forEach(track => track.stop());
        logInfo('getUserMedia test successful', 'Permission');
        return { granted: true, denied: false, prompt: false };
      } catch (error: any) {
        logError(`getUserMedia test failed: ${error.name} - ${error.message}`, 'Permission');
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          return { granted: false, denied: true, prompt: false, error: 'denied' };
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          return { granted: false, denied: true, prompt: false, error: 'unavailable' };
        } else {
          return { granted: false, denied: true, prompt: false, error: 'not_supported' };
        }
      }
    } catch (error) {
      logError(`Permission check failed: ${error}`, 'Permission');
      return { granted: false, denied: true, prompt: false, error: 'not_supported' };
    }
  }, [logInfo, logError]);

  const requestCameraPermission = useCallback(async () => {
    logInfo('Requesting camera permission', 'Permission');
    const permissionState = await checkCameraPermission();
    
    if (permissionState.granted) {
      logInfo('Permission already granted', 'Permission');
      return true;
    }
    
    if (permissionState.denied && permissionState.error) {
      logError(`Permission denied: ${permissionState.error}`, 'Permission');
      return false;
    }

    // If in prompt state, try to trigger the permission dialog
    try {
      logInfo('Triggering permission dialog', 'Permission');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      logInfo('Permission granted after prompt', 'Permission');
      return true;
    } catch (error) {
      logError(`Permission request failed: ${error}`, 'Permission');
      return false;
    }
  }, [checkCameraPermission, logInfo, logError]);

  const captureImageFromCamera = useCallback(async (
    facingMode: 'user' | 'environment' = 'environment',
    quality: number = 0.8
  ): Promise<File | null> => {
    try {
      logInfo(`Starting image capture with facing mode: ${facingMode}`, 'Capture');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      logInfo('Stream acquired successfully', 'Capture');

      return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.srcObject = stream;
        video.play();

        video.addEventListener('loadedmetadata', () => {
          logInfo(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`, 'Capture');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          setTimeout(() => {
            if (context) {
              context.drawImage(video, 0, 0);
              logInfo('Image drawn to canvas', 'Capture');
              
              canvas.toBlob((blob) => {
                stream.getTracks().forEach(track => track.stop());
                
                if (blob) {
                  const file = new File([blob], `photo-${Date.now()}.jpg`, {
                    type: 'image/jpeg'
                  });
                  logInfo(`Image captured successfully: ${file.size} bytes`, 'Capture');
                  resolve(file);
                } else {
                  logError('Failed to create blob from canvas', 'Capture');
                  resolve(null);
                }
              }, 'image/jpeg', quality);
            } else {
              logError('Failed to get 2D context from canvas', 'Capture');
              stream.getTracks().forEach(track => track.stop());
              resolve(null);
            }
          }, 100);
        });
      });
    } catch (error) {
      const errorMsg = `Image capture failed: ${error}`;
      logError(errorMsg, 'Capture');
      toast({
        title: "Capture Failed",
        description: "Unable to capture image. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast, logInfo, logError]);

  const compressImage = useCallback(async (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<File> => {
    logInfo(`Starting image compression: ${file.name} (${file.size} bytes)`, 'Compression');
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        const originalDimensions = `${width}x${height}`;

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

        logInfo(`Compression settings: ${originalDimensions} -> ${width}x${height}, quality: ${quality}`, 'Compression');

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
              const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
              logInfo(`Compression complete: ${compressedFile.size} bytes (${compressionRatio}% reduction)`, 'Compression');
              resolve(compressedFile);
            } else {
              logError('Failed to create compressed blob', 'Compression');
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        logError('Failed to load image for compression', 'Compression');
        resolve(file);
      };

      img.src = URL.createObjectURL(file);
    });
  }, [logInfo, logError]);

  return {
    isSupported,
    capabilities,
    checkCameraSupport,
    checkCameraPermission,
    requestCameraPermission,
    captureImageFromCamera,
    compressImage,
    // Debug capabilities
    debugMode,
    debugInfo,
    errors,
    enableDebug,
    disableDebug,
    collectDebugInfo
  };
}