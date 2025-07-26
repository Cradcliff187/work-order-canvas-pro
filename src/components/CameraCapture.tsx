import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { isMobileBrowser, getCameraAttribute } from '@/utils/mobileDetection';
import CameraPermissionHelper from './CameraPermissionHelper';
import { CameraDebugPanel } from './CameraDebugPanel';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  maxPhotos?: number;
  quality?: number;
}

export function CameraCapture({ 
  onCapture, 
  onClose, 
  maxPhotos = 10,
  quality = 0.8 
}: CameraCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);
  const [permissionError, setPermissionError] = useState<'denied' | 'unavailable' | 'not_supported'>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { 
    checkCameraPermission,
    debugMode,
    debugInfo,
    errors,
    enableDebug,
    disableDebug,
    collectDebugInfo
  } = useCamera();

  const startCamera = useCallback(async () => {
    try {
      const permissionState = await checkCameraPermission();
      
      if (!permissionState.granted) {
        setPermissionError(permissionState.error);
        setShowPermissionHelper(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setShowPermissionHelper(false);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      let errorType: 'denied' | 'unavailable' | 'not_supported' = 'not_supported';
      if (error.name === 'NotAllowedError') errorType = 'denied';
      else if (error.name === 'NotFoundError') errorType = 'unavailable';
      
      setPermissionError(errorType);
      setShowPermissionHelper(true);
    }
  }, [facingMode, checkCameraPermission]);

  const handleFileInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length && capturedImages.length + i < maxPhotos; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        // Compress the image
        const compressedBlob = await compressImage(file, quality);
        const compressedFile = new File([compressedBlob], `photo-${Date.now()}-${i}.jpg`, {
          type: 'image/jpeg'
        });
        
        onCapture(compressedFile);
        
        // Add to preview
        const imageUrl = URL.createObjectURL(compressedBlob);
        setCapturedImages(prev => [...prev, imageUrl]);
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [capturedImages.length, maxPhotos, onCapture, quality]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || capturedImages.length >= maxPhotos) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          // Compress image
          const compressedBlob = await compressImage(blob, quality);
          const file = new File([compressedBlob], `photo-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          
          onCapture(file);
          
          // Add to preview
          const imageUrl = URL.createObjectURL(compressedBlob);
          setCapturedImages(prev => [...prev, imageUrl]);
        }
      }, 'image/jpeg', quality);
    }
  }, [capturedImages.length, maxPhotos, onCapture, quality]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    stopCamera();
  }, [stopCamera]);

  const compressImage = async (blob: Blob, quality: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

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
          (compressedBlob) => {
            resolve(compressedBlob || blob);
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(blob);
    });
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
      capturedImages.forEach(url => URL.revokeObjectURL(url));
    };
  }, [stopCamera, capturedImages]);

  React.useEffect(() => {
    if (isStreaming) {
      startCamera();
    }
  }, [facingMode, isStreaming, startCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{fallbackMode ? "Photo Upload" : "Camera"}</h2>
          {!fallbackMode && (
            <Button variant="ghost" onClick={switchCamera}>
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}
          {fallbackMode && <div className="w-10" />}
        </div>

        {/* Hidden file input for fallback mode */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          {...(getCameraAttribute() && { capture: getCameraAttribute() as "user" | "environment" })}
        />

        {/* Camera View */}
        <div className="flex-1 relative bg-black">
          {fallbackMode ? (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-muted/50">
              <div className="text-center space-y-4">
                <Upload className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Camera not available</h3>
                <p className="text-muted-foreground max-w-sm">
                  Select photos from your device's camera or gallery
                </p>
                <Button
                  onClick={triggerFileInput}
                  size="lg"
                  disabled={capturedImages.length >= maxPhotos}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Select Photos
                </Button>
              </div>
              
              {/* Photo Count for fallback mode */}
              {capturedImages.length > 0 && (
                <div className="absolute top-4 right-4 bg-background border px-3 py-1 rounded-full text-sm">
                  {capturedImages.length}/{maxPhotos}
                </div>
              )}
            </div>
          ) : !isStreaming ? (
            <div className="flex items-center justify-center h-full">
              <Button onClick={startCamera} size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Start Camera
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Controls */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-white text-black hover:bg-gray-200"
                  disabled={capturedImages.length >= maxPhotos}
                >
                  <Camera className="h-8 w-8" />
                </Button>
              </div>

              {/* Photo Count */}
              {capturedImages.length > 0 && (
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {capturedImages.length}/{maxPhotos}
                </div>
              )}
            </>
          )}
        </div>

        {/* Preview Thumbnails */}
        {capturedImages.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex gap-2 overflow-x-auto">
              {capturedImages.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Captured ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border"
                />
              ))}
            </div>
          </div>
        )}

        {/* Debug Panel */}
        <div className="p-4">
          <CameraDebugPanel
            debugMode={debugMode}
            debugInfo={debugInfo}
            errors={errors}
            onToggleDebug={debugMode ? disableDebug : enableDebug}
            onRefreshInfo={collectDebugInfo}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={onClose} 
              className="flex-1"
              disabled={capturedImages.length === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Done ({capturedImages.length})
            </Button>
          </div>
        </div>
      </div>

      <CameraPermissionHelper
        isVisible={showPermissionHelper}
        onClose={() => {
          setShowPermissionHelper(false);
          onClose();
        }}
        onRetry={startCamera}
        permissionDeniedReason={permissionError}
        showFallbackOption={true}
        onUseFallback={() => {
          setShowPermissionHelper(false);
          setFallbackMode(true);
        }}
      />
    </div>
  );
}