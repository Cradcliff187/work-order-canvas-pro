import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Save, Send, DollarSign, Building2, Clock, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface FloatingActionBarProps {
  vendorName?: string;
  amount?: number;
  workOrderAssigned?: boolean;
  isFormValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  showDraftSaved?: boolean;
  className?: string;
  flowStage?: 'capture' | 'processing' | 'review' | 'manual-entry';
}

const FloatingActionBarComponent: React.FC<FloatingActionBarProps> = ({
  vendorName,
  amount,
  workOrderAssigned,
  isFormValid,
  isDirty,
  isSubmitting,
  onSaveDraft,
  onSubmit,
  showDraftSaved,
  className,
  flowStage
}) => {
  const isMobile = useIsMobile();
  const { onFormSave, onSubmitSuccess } = useHapticFeedback();
  
  // Only show when in review or manual-entry stages with meaningful data
  if ((flowStage !== 'review' && flowStage !== 'manual-entry') || (!isDirty && !vendorName && !amount)) {
    return null;
  }

  const handleSaveDraft = useCallback(() => {
    onFormSave();
    onSaveDraft();
  }, [onFormSave, onSaveDraft]);

  const handleSubmit = useCallback(() => {
    onSubmitSuccess();
    onSubmit();
  }, [onSubmitSuccess, onSubmit]);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 animate-slide-in-bottom",
      "bg-background/80 backdrop-blur-lg border-t border-border",
      "safe-area-pb", // For mobile safe area
      isMobile && "rounded-t-xl border-x", // Mobile bottom sheet style
      className
    )}>
      {/* Mobile drag handle */}
      {isMobile && (
        <div className="flex justify-center pt-2 pb-1">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* Quick Stats Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 min-w-0">
            {/* Vendor */}
            {vendorName && (
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{vendorName}</span>
              </div>
            )}
            
            {/* Amount */}
            {amount && amount > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold text-primary">
                  ${amount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {workOrderAssigned && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Assigned
              </Badge>
            )}
            
            {showDraftSaved && (
              <Badge variant="default" className="text-xs animate-fade-in">
                <Clock className="h-3 w-3 mr-1" />
                Draft Saved
              </Badge>
            )}
            
            {!isFormValid && isDirty && (
              <Badge variant="destructive" className="text-xs">
                Missing Info
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Save Draft Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting || !isDirty}
            className="flex-1 min-h-[48px]" // Enhanced touch target
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          {/* Submit Button */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="flex-1 min-h-[48px]" // Enhanced touch target
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Receipt
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Memoize component for performance
export const FloatingActionBar = React.memo(FloatingActionBarComponent, (prevProps, nextProps) => {
  return (
    prevProps.vendorName === nextProps.vendorName &&
    prevProps.amount === nextProps.amount &&
    prevProps.workOrderAssigned === nextProps.workOrderAssigned &&
    prevProps.isFormValid === nextProps.isFormValid &&
    prevProps.isDirty === nextProps.isDirty &&
    prevProps.isSubmitting === nextProps.isSubmitting &&
    prevProps.showDraftSaved === nextProps.showDraftSaved &&
    prevProps.flowStage === nextProps.flowStage
  );
});