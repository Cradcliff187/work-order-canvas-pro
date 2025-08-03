import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onDelete?: () => void;
  deleteLabel?: string;
  disabled?: boolean;
  className?: string;
  itemName?: string;
  itemType?: string;
}

export const SwipeableListItem: React.FC<SwipeableListItemProps> = ({
  children,
  onDelete,
  deleteLabel = "Delete",
  disabled = false,
  className = "",
  itemName = "item",
  itemType = "item"
}) => {
  const [dragX, setDragX] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x < -threshold && onDelete && !disabled) {
      // Swiped left beyond threshold - show delete confirmation
      setShowDeleteConfirm(true);
    }
    
    // Reset position
    setDragX(0);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const swipeProgress = Math.abs(dragX) / 100;
  const deleteOpacity = Math.min(swipeProgress, 1);

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Delete background - appears when swiping left */}
        {onDelete && !disabled && (
          <div 
            className="absolute inset-0 bg-destructive flex items-center justify-end px-4 transition-opacity duration-200"
            style={{ opacity: dragX < 0 ? deleteOpacity : 0 }}
          >
            <Trash2 className="h-5 w-5 text-destructive-foreground" />
          </div>
        )}

        {/* Main content */}
        <motion.div
          drag={onDelete && !disabled ? "x" : false}
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