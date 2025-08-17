import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Upload, FileText, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingProgressProps {
  isVisible: boolean;
  stage: 'uploading' | 'processing' | 'extracting' | 'complete' | 'error';
  progress: number;
  message?: string;
  onRetry?: () => void;
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
  className
}: FloatingProgressProps) {
  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className={cn(
            "fixed top-4 left-1/2 transform -translate-x-1/2 z-40",
            "bg-background/95 backdrop-blur-lg border border-border rounded-lg shadow-lg",
            "min-w-[320px] max-w-[90vw]",
            className
          )}
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 25
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -50, 
            scale: 0.95,
            transition: { duration: 0.2 }
          }}
        >
          <motion.div 
            className="p-4"
            animate={stage === 'complete' ? {
              boxShadow: [
                "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                "0 10px 25px -3px rgba(34, 197, 94, 0.3)",
                "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              ]
            } : {}}
            transition={{ duration: 1, repeat: stage === 'complete' ? 1 : 0 }}
          >
            {/* Header with icon and stage */}
            <div className="flex items-center gap-3 mb-3">
              <motion.div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  stage === 'complete' ? "bg-success/20" :
                  stage === 'error' ? "bg-destructive/20" :
                  "bg-primary/20"
                )}
                animate={stage === 'complete' ? {
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    "0 0 0px rgba(34, 197, 94, 0.4)",
                    "0 0 20px rgba(34, 197, 94, 0.4)",
                    "0 0 0px rgba(34, 197, 94, 0.4)"
                  ]
                } : stage === 'processing' || stage === 'extracting' ? {
                  scale: [1, 1.05, 1]
                } : {}}
                transition={stage === 'complete' ? {
                  duration: 0.8,
                  times: [0, 0.5, 1]
                } : {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <motion.div
                  animate={stage === 'processing' ? {
                    rotate: 360
                  } : stage === 'complete' ? {
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={stage === 'processing' ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  } : stage === 'complete' ? {
                    duration: 0.6,
                    delay: 0.2
                  } : {}}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                </motion.div>
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <motion.span 
                    className="font-medium"
                    animate={stage === 'complete' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    {config.label}
                  </motion.span>
                  {stage !== 'complete' && stage !== 'error' && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(progress)}%
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <motion.p 
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {message || config.description}
                </motion.p>
              </div>

              {/* Retry button for errors */}
              {stage === 'error' && onRetry && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <button
                    onClick={onRetry}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    title="Retry OCR processing"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </div>

            {/* Progress bar (not shown for complete/error states) */}
            {stage !== 'complete' && stage !== 'error' && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  style={{ transformOrigin: "left" }}
                >
                  <Progress value={progress} className="h-2" />
                </motion.div>
                
                {/* Stage indicators */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <motion.span 
                    className={stage === 'uploading' ? 'text-primary font-medium' : ''}
                    animate={stage === 'uploading' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    Upload
                  </motion.span>
                  <motion.span 
                    className={stage === 'processing' ? 'text-primary font-medium' : ''}
                    animate={stage === 'processing' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    Process
                  </motion.span>
                  <motion.span 
                    className={stage === 'extracting' ? 'text-primary font-medium' : ''}
                    animate={stage === 'extracting' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    Extract
                  </motion.span>
                </div>
              </motion.div>
            )}

            {/* Success summary for complete state */}
            {stage === 'complete' && message && (
              <motion.div 
                className="mt-2 p-2 bg-success/10 rounded-md"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                <p className="text-sm text-success font-medium">{message}</p>
              </motion.div>
            )}

            {/* Error details for error state */}
            {stage === 'error' && (
              <motion.div 
                className="mt-2 p-2 bg-destructive/10 rounded-md"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <p className="text-sm text-destructive">
                  {message || "Please try again or enter details manually"}
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}