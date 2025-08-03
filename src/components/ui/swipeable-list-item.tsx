import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

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
  const [dragX, setDragX] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Default left action to delete if onDelete is provided
  const effectiveLeftAction = leftAction || (onDelete ? {
    icon: Trash2,
    label: deleteLabel,
    color: 'destructive' as const,
    confirmMessage: `Delete ${itemType} "${itemName}"?`
  } : undefined);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const leftThreshold = -80;
    const rightThreshold = 60;
    
    if (info.offset.x < leftThreshold && (effectiveLeftAction || onSwipeLeft) && !disabled) {
      // Swiped left beyond threshold
      if (effectiveLeftAction?.confirmMessage || onDelete) {
        setShowDeleteConfirm(true);
      } else if (onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (info.offset.x > rightThreshold && (rightAction || onSwipeRight) && !disabled) {
      // Swiped right beyond threshold
      if (rightAction?.confirmMessage) {
        // Could add right action confirmation here
      } else if (onSwipeRight) {
        onSwipeRight();
      }
    }
    
    // Reset position
    setDragX(0);
  };

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

  // Calculate opacity for background reveals
  const leftSwipeProgress = Math.max(0, -dragX / 120);
  const rightSwipeProgress = Math.max(0, dragX / 100);
  const leftOpacity = Math.min(leftSwipeProgress, 1);
  const rightOpacity = Math.min(rightSwipeProgress, 1);

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
      <div className="relative overflow-hidden">
        {/* Right action background - appears when swiping right */}
        {(rightAction || onSwipeRight) && !disabled && (
          <div 
            className={`absolute inset-0 ${getActionBackground(rightAction)} flex items-center justify-start px-4 transition-opacity duration-200`}
            style={{ opacity: dragX > 0 ? rightOpacity : 0 }}
          >
            {rightAction?.icon && (
              <rightAction.icon className={`h-5 w-5 ${getActionForeground(rightAction)}`} />
            )}
          </div>
        )}

        {/* Left action background - appears when swiping left */}
        {(effectiveLeftAction || onSwipeLeft) && !disabled && (
          <div 
            className={`absolute inset-0 ${getActionBackground(effectiveLeftAction)} flex items-center justify-end px-4 transition-opacity duration-200`}
            style={{ opacity: dragX < 0 ? leftOpacity : 0 }}
          >
            {effectiveLeftAction?.icon && (
              <effectiveLeftAction.icon className={`h-5 w-5 ${getActionForeground(effectiveLeftAction)}`} />
            )}
          </div>
        )}

        {/* Main content */}
        <motion.div
          drag={(effectiveLeftAction || onSwipeLeft || rightAction || onSwipeRight) && !disabled ? "x" : false}
          dragConstraints={{ left: -120, right: 100 }}
          dragElastic={0.2}
          onDrag={(event, info) => setDragX(info.offset.x)}
          onDragEnd={handleDragEnd}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          whileTap={{ scale: 0.98 }}
          className={`relative bg-card ${className}`}
          style={{ x: dragX }}
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