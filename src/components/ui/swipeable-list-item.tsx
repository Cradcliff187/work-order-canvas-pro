import React, { useState, useCallback, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: 'default' | 'destructive' | 'success';
  confirmMessage?: string;
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  onDelete?: () => void;
  deleteLabel?: string;
  disabled?: boolean;
  className?: string;
  itemName?: string;
  itemType?: string;
  // Enhanced props
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightAction?: SwipeAction;
  leftAction?: SwipeAction;
}

export const SwipeableListItem: React.FC<SwipeableListItemProps> = ({
  children,
  onDelete,
  deleteLabel = "Delete",
  disabled = false,
  className = "",
  itemName = "item",
  itemType = "item",
  onSwipeRight,
  onSwipeLeft,
  rightAction,
  leftAction
}) => {
  const isMobile = useIsMobile();
  const { triggerHaptic } = useHapticFeedback();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasTriggeredThreshold, setHasTriggeredThreshold] = useState(false);
  
  // Motion values for smooth animations
  const x = useMotionValue(0);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);

  // Default left action to delete if onDelete is provided
  const effectiveLeftAction = leftAction || (onDelete ? {
    icon: Trash2,
    label: deleteLabel,
    color: 'destructive' as const,
    confirmMessage: `Delete ${itemType} "${itemName}"?`
  } : undefined);

  // Transform values for dynamic styling
  const leftOpacity = useTransform(x, [-120, -40, 0], [1, 0.3, 0]);
  const rightOpacity = useTransform(x, [0, 40, 100], [0, 0.3, 1]);
  const leftScale = useTransform(x, [-120, -80, -40], [1.1, 1, 0.8]);
  const rightScale = useTransform(x, [40, 80, 120], [0.8, 1, 1.1]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const leftThreshold = -80;
    const rightThreshold = 60;
    
    if (info.offset.x < leftThreshold && (effectiveLeftAction || onSwipeLeft) && !disabled) {
      // Swiped left beyond threshold
      triggerHaptic({ pattern: 'medium' });
      if (effectiveLeftAction?.confirmMessage || onDelete) {
        setShowDeleteConfirm(true);
      } else if (onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (info.offset.x > rightThreshold && (rightAction || onSwipeRight) && !disabled) {
      // Swiped right beyond threshold
      triggerHaptic({ pattern: 'medium' });
      if (rightAction?.confirmMessage) {
        // Could add right action confirmation here
      } else if (onSwipeRight) {
        onSwipeRight();
      }
    }
    
    // Reset haptic state
    setHasTriggeredThreshold(false);
  }, [effectiveLeftAction, rightAction, onSwipeLeft, onSwipeRight, onDelete, disabled, triggerHaptic]);

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    const leftThreshold = -80;
    const rightThreshold = 60;
    
    // Trigger haptic feedback when crossing thresholds (only once per drag)
    if (!hasTriggeredThreshold) {
      if ((info.offset.x < leftThreshold && (effectiveLeftAction || onSwipeLeft)) || 
          (info.offset.x > rightThreshold && (rightAction || onSwipeRight))) {
        triggerHaptic({ pattern: 'light' });
        setHasTriggeredThreshold(true);
      }
    }
    
    // Reset threshold state when returning to center
    if (Math.abs(info.offset.x) < 20) {
      setHasTriggeredThreshold(false);
    }
    
    x.set(info.offset.x);
  }, [hasTriggeredThreshold, effectiveLeftAction, rightAction, onSwipeLeft, onSwipeRight, triggerHaptic, x]);

  const handleDelete = async () => {
    if (!onDelete && !onSwipeLeft) return;
    
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete();
      } else if (onSwipeLeft) {
        await onSwipeLeft();
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };


  // Get background colors based on action type
  const getActionBackground = (action?: SwipeAction) => {
    if (!action) return 'bg-muted';
    switch (action.color) {
      case 'destructive':
        return 'bg-destructive';
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-primary';
    }
  };

  const getActionForeground = (action?: SwipeAction) => {
    if (!action) return 'text-muted-foreground';
    switch (action.color) {
      case 'destructive':
        return 'text-destructive-foreground';
      case 'success':
        return 'text-white';
      default:
        return 'text-primary-foreground';
    }
  };

  return (
    <>
      <div 
        ref={dragConstraintsRef}
        className="relative overflow-hidden will-change-transform"
      >
        {/* Right action background - appears when swiping right */}
        {(rightAction || onSwipeRight) && !disabled && (
          <motion.div 
            className={`absolute inset-0 ${getActionBackground(rightAction)} flex items-center justify-start px-4`}
            style={{ opacity: rightOpacity }}
          >
            {rightAction?.icon && (
              <motion.div style={{ scale: rightScale }}>
                <rightAction.icon className={`h-5 w-5 ${getActionForeground(rightAction)}`} />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Left action background - appears when swiping left */}
        {(effectiveLeftAction || onSwipeLeft) && !disabled && (
          <motion.div 
            className={`absolute inset-0 ${getActionBackground(effectiveLeftAction)} flex items-center justify-end px-4`}
            style={{ opacity: leftOpacity }}
          >
            {effectiveLeftAction?.icon && (
              <motion.div style={{ scale: leftScale }}>
                <effectiveLeftAction.icon className={`h-5 w-5 ${getActionForeground(effectiveLeftAction)}`} />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Main content */}
        <motion.div
          drag={(effectiveLeftAction || onSwipeLeft || rightAction || onSwipeRight) && !disabled && isMobile ? "x" : false}
          dragConstraints={{ left: -120, right: 100 }}
          dragElastic={0.15}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ x }}
          animate={{ x: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            mass: 0.8
          }}
          whileTap={{ scale: isMobile ? 0.995 : 1 }}
          className={`relative bg-card ${className}`}
        >
          {children}
        </motion.div>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        itemName={itemName}
        itemType={itemType}
        isLoading={isDeleting}
      />
    </>
  );
};