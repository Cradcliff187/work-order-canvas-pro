import * as React from "react";
import { cn } from "@/lib/utils";

export interface EnhancedUploadTriggerProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const EnhancedUploadTrigger = React.forwardRef<
  HTMLButtonElement,
  EnhancedUploadTriggerProps
>(({ children, onClick, className, disabled = false, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        "relative inline-flex items-center justify-center gap-2",
        "rounded-xl px-6 py-3 text-sm font-medium",
        "bg-primary text-primary-foreground",
        
        // Animations and transitions
        "transition-all duration-300 ease-out",
        "animate-pulse",
        
        // Hover effects
        "hover:scale-105 hover:shadow-lg",
        "hover:shadow-primary/25",
        
        // Active state
        "active:scale-[0.98]",
        
        // Focus states
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2",
        
        // Disabled state
        "disabled:opacity-50 disabled:pointer-events-none",
        "disabled:hover:scale-100 disabled:hover:shadow-none",
        
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

EnhancedUploadTrigger.displayName = "EnhancedUploadTrigger";

export { EnhancedUploadTrigger };