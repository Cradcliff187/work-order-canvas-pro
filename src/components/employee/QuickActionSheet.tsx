import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Camera, 
  Receipt, 
  Coffee, 
  LogOut,
  X 
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MobileBottomSheet } from './mobile/MobileBottomSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClockState } from '@/hooks/useClockState';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'success';
  requiresConfirmation?: boolean;
}

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ isOpen, onClose }: QuickActionSheetProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { clockOut, isClockingOut, isClocked } = useClockState();
  const { triggerHaptic, onError, onSubmitSuccess } = useHapticFeedback();

  const handleSubmitReport = () => {
    triggerHaptic({ pattern: 'light' });
    navigate('/employee/time-reports');
    onClose();
  };

  const handleAddPhoto = () => {
    triggerHaptic({ pattern: 'light' });
    // TODO: Implement camera functionality
    toast({
      title: "Camera",
      description: "Camera feature coming soon",
    });
    onClose();
  };

  const handleAddReceipt = () => {
    triggerHaptic({ pattern: 'light' });
    navigate('/employee/receipts');
    onClose();
  };

  const handleTakeBreak = async () => {
    if (!isClocked) {
      onError();
      toast({
        title: "Not clocked in",
        description: "You need to be clocked in to take a break",
        variant: "destructive",
      });
      return;
    }

    try {
      triggerHaptic({ pattern: 'medium' });
      await clockOut.mutateAsync(false);
      onSubmitSuccess();
      toast({
        title: "Break started",
        description: "You have been clocked out for break",
      });
      onClose();
    } catch (error) {
      onError();
      toast({
        title: "Error",
        description: "Failed to start break",
        variant: "destructive",
      });
    }
  };

  const handleEndDay = async () => {
    if (!isClocked) {
      onError();
      toast({
        title: "Not clocked in",
        description: "You are not currently clocked in",
        variant: "destructive",
      });
      return;
    }

    try {
      triggerHaptic({ pattern: 'heavy' });
      await clockOut.mutateAsync(false);
      onSubmitSuccess();
      toast({
        title: "Day ended",
        description: "You have been clocked out successfully",
      });
      onClose();
    } catch (error) {
      onError();
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive",
      });
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'submit-report',
      label: 'Submit Report',
      icon: FileText,
      action: handleSubmitReport,
    },
    {
      id: 'add-photo',
      label: 'Add Photo',
      icon: Camera,
      action: handleAddPhoto,
    },
    {
      id: 'add-receipt',
      label: 'Add Receipt',
      icon: Receipt,
      action: handleAddReceipt,
    },
    {
      id: 'take-break',
      label: 'Take Break',
      icon: Coffee,
      action: handleTakeBreak,
      variant: 'success',
    },
    {
      id: 'end-day',
      label: 'End Day',
      icon: LogOut,
      action: handleEndDay,
      variant: 'destructive',
    },
  ];

  const getActionStyles = (variant?: string) => {
    switch (variant) {
      case 'destructive':
        return 'text-destructive hover:bg-destructive/10';
      case 'success':
        return 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20';
      default:
        return 'text-foreground hover:bg-muted';
    }
  };

  const renderContent = () => (
    <div className="space-y-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const isLoading = (action.id === 'take-break' || action.id === 'end-day') && isClockingOut;
        
        return (
          <button
            key={action.id}
            onClick={action.action}
            disabled={isLoading}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl transition-colors",
              isMobile ? "min-h-[56px]" : "min-h-[48px]",
              "border border-border/50 bg-background",
              "touch-manipulation",
              isLoading ? 'opacity-50 cursor-not-allowed' : getActionStyles(action.variant)
            )}
          >
            <div className="flex-shrink-0">
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-left font-medium">
              {isLoading ? 'Processing...' : action.label}
            </span>
          </button>
        );
      })}
      
      <button
        onClick={onClose}
        className={cn(
          "w-full flex items-center justify-center gap-2 p-4 rounded-xl transition-colors mt-4 bg-muted hover:bg-muted/80",
          isMobile ? "min-h-[56px]" : "min-h-[48px]",
          "touch-manipulation"
        )}
      >
        <X className="h-5 w-5" />
        <span className="font-medium">Cancel</span>
      </button>
    </div>
  );

  return isMobile ? (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Actions"
      swipeToClose={true}
      backdropTapToClose={true}
      hapticFeedback={true}
    >
      {renderContent()}
    </MobileBottomSheet>
  ) : (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-auto rounded-t-3xl border-t border-border bg-background p-0 focus:outline-none"
      >
        <div className="px-6 pt-4 pb-2">
          <SheetHeader className="text-center">
            <div className="mx-auto w-12 h-1 bg-muted-foreground/30 rounded-full mb-4" />
            <SheetTitle className="text-lg font-semibold text-center">
              Quick Actions
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="px-6 pb-8">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}