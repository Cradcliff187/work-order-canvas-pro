import * as React from "react";
import { cn } from "@/lib/utils";

export interface EnhancedUploadTriggerProps {
  children: React.ReactElement;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const EnhancedUploadTrigger = React.forwardRef<
  HTMLDivElement,
  EnhancedUploadTriggerProps
>(({ children, onClick, className, disabled = false, ...props }, ref) => {
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
        // Base wrapper styles
        "relative",
        
        // Enhancement animations and transitions
        "transition-all duration-300 ease-out",
        
        // Pulse animation (subtle)
        !disabled && "animate-pulse [animation-duration:3s]",
        
        // Hover effects
        !disabled && [
          "hover:scale-[1.02]",
          // Gradient overlay using before pseudo-element
          "before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-r",
          "before:from-primary/10 before:to-accent/10 before:opacity-0",
          "before:transition-opacity before:duration-300 hover:before:opacity-100",
          "before:pointer-events-none before:z-0"
        ],
        
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