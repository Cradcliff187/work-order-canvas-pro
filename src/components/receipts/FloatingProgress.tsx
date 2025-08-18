import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Upload, FileText, Sparkles, RefreshCw, Edit, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingProgressProps {
  isVisible: boolean;
  stage: 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';
  progress: number;
  message?: string;
  onRetry?: () => void;
  onManualEntry?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  className?: string;
}

const stageConfig = {
  uploading: {
    icon: Upload,
    label: "Uploading...",
    color: "text-blue-500",
    description: "Uploading your receipt image"
  },
  processing: {
    icon: FileText,
    label: "Reading receipt...",
    color: "text-orange-500",
    description: "Analyzing document structure"
  },
  extracting: {
    icon: Sparkles,
    label: "Extracting data...",
    color: "text-purple-500",
    description: "Extracting vendor, amount, and details"
  },
  complete: {
    icon: CheckCircle,
    label: "Complete!",
    color: "text-success",
    description: "Receipt data extracted successfully"
  },
  error: {
    icon: AlertCircle,
    label: "Failed",
    color: "text-destructive",
    description: "Could not process receipt"
  }
};

export function FloatingProgress({
  isVisible,
  stage,
  progress,
  message,
  onRetry,
  onManualEntry,
  onCancel,
  showCancel = false,
  className
}: FloatingProgressProps) {
  if (!isVisible) {
    return null;
  }

  const config = stageConfig[stage] || stageConfig.error;
  const Icon = config?.icon || AlertCircle;

  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-40",
      "bg-background/95 backdrop-blur-lg border border-border rounded-lg shadow-lg",
      "min-w-[320px] max-w-[90vw] animate-fade-in",
      className
    )}>
      <div className="p-4">
        {/* Header with icon and stage */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            stage === 'complete' ? "bg-success/20" :
            stage === 'error' ? "bg-destructive/20" :
            "bg-primary/20"
          )}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{config.label}</span>
              {stage !== 'complete' && stage !== 'error' && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(progress)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {message || config.description}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1">
            {/* Cancel button for active processing */}
            {showCancel && onCancel && stage !== 'complete' && stage !== 'error' && (
              <button
                onClick={onCancel}
                className="p-2 hover:bg-destructive/20 text-destructive rounded-md transition-colors text-xs"
                title="Cancel processing"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            
            {/* Error recovery actions */}
            {stage === 'error' && (onRetry || onManualEntry) && (
              <>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="p-2 hover:bg-muted rounded-md transition-colors text-xs"
                    title="Try OCR again"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                {onManualEntry && (
                  <button
                    onClick={onManualEntry}
                    className="p-2 hover:bg-muted rounded-md transition-colors text-xs"
                    title="Enter details manually"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Progress bar (not shown for complete/error states) */}
        {stage !== 'complete' && stage !== 'error' && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            
            {/* Stage indicators */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={stage === 'uploading' ? 'text-primary font-medium' : ''}>
                Upload
              </span>
              <span className={stage === 'processing' ? 'text-primary font-medium' : ''}>
                Process
              </span>
              <span className={stage === 'extracting' ? 'text-primary font-medium' : ''}>
                Extract
              </span>
            </div>
            
            {/* Cancel button for mobile */}
            {showCancel && onCancel && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={onCancel}
                  className="px-3 py-1 text-xs text-destructive hover:bg-destructive/20 rounded-md transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel Processing
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success summary for complete state */}
        {stage === 'complete' && message && (
          <div className="mt-2 p-2 bg-success/10 rounded-md">
            <p className="text-sm text-success font-medium">{message}</p>
          </div>
        )}

        {/* Error details with actionable recovery */}
        {stage === 'error' && (
          <div className="mt-2 space-y-2">
            <div className="p-2 bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive font-medium">
                {message || "Unable to read receipt"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try again with better lighting or enter details manually
              </p>
            </div>
            
            {/* Action buttons in FloatingProgress */}
            {(onRetry || onManualEntry) && (
              <div className="flex gap-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex-1 px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try Again
                  </button>
                )}
                {onManualEntry && (
                  <button
                    onClick={onManualEntry}
                    className="flex-1 px-3 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Manual Entry
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}