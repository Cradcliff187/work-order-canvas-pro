import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  Upload, 
  Sparkles, 
  Edit, 
  Send,
  Play,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/utils/analytics';
import { useIsMobile } from '@/hooks/use-mobile';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
}

interface ReceiptTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentStep?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Smart Receipt Capture',
    description: 'Let me show you how to effortlessly capture and process your receipts with AI-powered extraction.',
    icon: <Sparkles className="w-5 h-5" />,
    position: 'center'
  },
  {
    id: 'upload-methods',
    title: 'Multiple Upload Options',
    description: 'Take a photo with your camera or upload an existing image. Our system works with all common image formats.',
    icon: <Camera className="w-5 h-5" />,
    target: '[data-tour="upload-section"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'ocr-magic',
    title: 'AI-Powered Data Extraction',
    description: 'Watch as our OCR technology automatically extracts vendor, amount, date, and line items from your receipt.',
    icon: <Sparkles className="w-5 h-5" />,
    target: '[data-tour="ocr-section"]',
    position: 'top'
  },
  {
    id: 'review-edit',
    title: 'Review & Edit',
    description: 'All extracted data is editable. Confidence badges show how accurate each field is. Yellow means double-check!',
    icon: <Edit className="w-5 h-5" />,
    target: '[data-tour="form-section"]',
    position: 'right'
  },
  {
    id: 'work-orders',
    title: 'Link to Work Orders',
    description: 'Easily assign receipts to specific work orders with our smart search and filtering system.',
    icon: <Upload className="w-5 h-5" />,
    target: '[data-tour="work-order-section"]',
    position: 'left'
  },
  {
    id: 'submit',
    title: 'Submit & Track',
    description: 'Submit your receipt and track its status. Drafts are automatically saved so you never lose progress!',
    icon: <Send className="w-5 h-5" />,
    target: '[data-tour="submit-section"]',
    position: 'top'
  }
];

const TOUR_STORAGE_KEY = 'receipt_tour_completed';

export const ReceiptTour: React.FC<ReceiptTourProps> = ({
  isVisible,
  onComplete,
  onSkip,
  currentStep = 0
}) => {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [isAnimating, setIsAnimating] = useState(false);
  const { trackTourProgress } = useAnalytics();
  const isMobile = useIsMobile();

  const currentTourStep = TOUR_STEPS[activeStep];
  const isLastStep = activeStep === TOUR_STEPS.length - 1;
  const isFirstStep = activeStep === 0;

  useEffect(() => {
    if (isVisible && activeStep === 0) {
      trackTourProgress('started', 1, TOUR_STEPS.length);
    }
  }, [isVisible, activeStep, trackTourProgress]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
      return;
    }

    setIsAnimating(true);
    setTimeout(() => {
      setActiveStep(prev => prev + 1);
      setIsAnimating(false);
    }, 200);
  }, [isLastStep]);

  const handlePrevious = useCallback(() => {
    if (isFirstStep) return;

    setIsAnimating(true);
    setTimeout(() => {
      setActiveStep(prev => prev - 1);
      setIsAnimating(false);
    }, 200);
  }, [isFirstStep]);

  const handleComplete = useCallback(() => {
    trackTourProgress('completed', TOUR_STEPS.length, TOUR_STEPS.length);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    onComplete();
  }, [trackTourProgress, onComplete]);

  const handleSkip = useCallback(() => {
    trackTourProgress('skipped', activeStep + 1, TOUR_STEPS.length);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    onSkip();
  }, [activeStep, trackTourProgress, onSkip]);

  const getStepPosition = useCallback(() => {
    if (currentTourStep.position === 'center') {
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }

    const target = currentTourStep.target ? document.querySelector(currentTourStep.target) : null;
    if (!target) {
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }

    const rect = target.getBoundingClientRect();
    const positions = {
      top: `top-${Math.max(20, rect.top - 100)}px left-${rect.left + rect.width / 2}px transform -translate-x-1/2`,
      bottom: `top-${rect.bottom + 20}px left-${rect.left + rect.width / 2}px transform -translate-x-1/2`,
      left: `top-${rect.top + rect.height / 2}px left-${Math.max(20, rect.left - 320)}px transform -translate-y-1/2`,
      right: `top-${rect.top + rect.height / 2}px left-${rect.right + 20}px transform -translate-y-1/2`
    };

    return positions[currentTourStep.position] || 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
  }, [currentTourStep]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
      
      {/* Highlight overlay */}
      {currentTourStep.highlight && currentTourStep.target && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-background/60" />
          <div 
            className="absolute border-2 border-primary rounded-lg shadow-glow animate-pulse"
            style={{
              ...(() => {
                const target = document.querySelector(currentTourStep.target!);
                if (!target) return {};
                const rect = target.getBoundingClientRect();
                return {
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8
                };
              })()
            }}
          />
        </div>
      )}

      {/* Tour card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "fixed z-[60] w-80 max-w-[90vw]",
            isMobile ? "bottom-4 left-4 right-4 w-auto" : getStepPosition()
          )}
        >
          <Card className="border-primary/20 shadow-elegant bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {currentTourStep.icon}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Step {activeStep + 1} of {TOUR_STEPS.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  {currentTourStep.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentTourStep.description}
                </p>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-1 my-4">
                {TOUR_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === activeStep ? "bg-primary w-6" : "bg-muted w-1.5"
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={isFirstStep || isAnimating}
                  className="h-8 px-3 text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="h-8 px-3"
                  >
                    Skip Tour
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={isAnimating}
                    size="sm"
                    className="h-8 px-3"
                  >
                    {isLastStep ? (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// Hook to manage tour state
export const useReceiptTour = () => {
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    setHasCompletedTour(completed);
    
    // Show tour on first visit if not completed
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(false);
    setShowTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
    setHasCompletedTour(true);
  }, []);

  const skipTour = useCallback(() => {
    setShowTour(false);
    setHasCompletedTour(true);
  }, []);

  return {
    showTour,
    hasCompletedTour,
    startTour,
    resetTour,
    completeTour,
    skipTour
  };
};