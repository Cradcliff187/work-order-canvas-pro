import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X } from "lucide-react";

interface CameraCaptureProps {
  isOpen: boolean;
  cameraStream: MediaStream | null;
  onCapture: () => void;
  onClose: () => void;
}

export function CameraCapture({
  isOpen,
  cameraStream,
  onCapture,
  onClose
}: CameraCaptureProps) {
  const handleCapture = useCallback(() => {
    onCapture();
  }, [onCapture]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && cameraStream && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
        >
          <div className="relative w-full h-full">
            <video
              ref={(video) => {
                if (video && cameraStream) {
                  video.srcObject = cameraStream;
                  video.play();
                }
              }}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* Camera controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-6">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleClose}
                  className="bg-black/50 border-white/20 text-white hover:bg-black/70 min-h-[56px] min-w-[56px]"
                >
                  <X className="h-6 w-6" />
                </Button>
                
                <Button
                  type="button"
                  size="lg"
                  onClick={handleCapture}
                  className="bg-primary text-primary-foreground min-w-[80px] min-h-[80px] rounded-full"
                >
                  <Camera className="h-8 w-8" />
                </Button>
                
                <div className="w-16" /> {/* Spacer for symmetry */}
              </div>
              
              <p className="text-center text-white/80 text-sm mt-4">
                Position receipt in frame and tap to capture
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}