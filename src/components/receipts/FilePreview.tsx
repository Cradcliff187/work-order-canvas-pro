import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

import { formatFileSize } from "@/utils/fileUtils";
import { getFieldConfidence } from "@/utils/confidence-display";
import { FileText, X } from "lucide-react";

interface FilePreviewProps {
  file: File | null;
  imagePreview: string | null;
  onRemove: () => void;
  swipeGesture?: any; // Removed useSwipeGesture
  ocrConfidence?: Record<string, number>;
}

export function FilePreview({
  file,
  imagePreview,
  onRemove,
  swipeGesture,
  ocrConfidence
}: FilePreviewProps) {
  const isMobile = useIsMobile();

  if (!file) return null;

  return (
    <div className="space-y-4" {...(isMobile && swipeGesture ? swipeGesture : {})}>
      {imagePreview ? (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Receipt preview"
            className="w-full max-h-64 object-contain rounded-lg border"
            style={{
              transform: isMobile && swipeGesture?.isSwipeing 
                ? `translateX(${swipeGesture.direction === 'left' ? -swipeGesture.distance : swipeGesture.distance}px)` 
                : 'none',
              opacity: isMobile && swipeGesture?.isSwipeing && swipeGesture.distance > 50 
                ? Math.max(0.3, 1 - swipeGesture.distance / 200) 
                : 1,
              transition: swipeGesture?.isSwipeing ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out'
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 min-h-[48px] min-w-[48px]"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
          {/* Swipe instruction for mobile */}
          {isMobile && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Swipe left or right to remove
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="min-h-[48px] min-w-[48px]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Enhanced Confidence Display */}
      {ocrConfidence && Object.keys(ocrConfidence).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            OCR Confidence
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ocrConfidence).map(([field, confidence]) => (
              <Badge
                key={field}
                variant={confidence >= 0.8 ? 'default' : confidence >= 0.5 ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {field}: {Math.round(confidence * 100)}%
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}