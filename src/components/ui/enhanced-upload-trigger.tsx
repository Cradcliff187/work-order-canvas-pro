import * as React from "react";
import { cn } from "@/lib/utils";

export interface EnhancedUploadTriggerProps {
  children: React.ReactElement;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  isProcessing?: boolean;
  isSuccess?: boolean;
}

const EnhancedUploadTrigger = React.forwardRef<
  HTMLDivElement,
  EnhancedUploadTriggerProps
>(({ children, onClick, className, disabled = false, isProcessing = false, isSuccess = false, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    
    // Call the onClick prop if provided
    if (onClick) {
      onClick();
    }
    
    // Also call the child's onClick if it exists
    if (children.props.onClick) {
      children.props.onClick(e);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        // Enhanced upload trigger base
        "upload-trigger-enhanced",
        
        // State-based classes
        isProcessing && "processing",
        isSuccess && "success",
        
        // Disabled state
        disabled && "opacity-50 pointer-events-none",
        
        className
      )}
      {...props}
    >
      {React.cloneElement(children, {
        onClick: handleClick,
        disabled: disabled || children.props.disabled,
        className: cn(
          // Ensure child is above the overlay
          "relative z-10",
          children.props.className
        ),
      })}
    </div>
  );
});

EnhancedUploadTrigger.displayName = "EnhancedUploadTrigger";

export { EnhancedUploadTrigger };