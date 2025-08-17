import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Save, Send, DollarSign, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function FloatingActionBar({
  vendorName,
  amount,
  workOrderAssigned,
  isFormValid,
  isDirty,
  isSubmitting,
  onSaveDraft,
  onSubmit,
  showDraftSaved,
  className
}: FloatingActionBarProps) {
  if (!isDirty && !vendorName && !amount) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 animate-slide-in-bottom",
      "bg-background/80 backdrop-blur-lg border-t border-border",
      "safe-area-pb", // For mobile safe area
      className
    )}>
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
            onClick={onSaveDraft}
            disabled={isSubmitting || !isDirty}
            className="flex-1 min-h-[44px]" // Touch-friendly height
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          {/* Submit Button */}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!isFormValid || isSubmitting}
            className="flex-1 min-h-[44px]" // Touch-friendly height
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
}