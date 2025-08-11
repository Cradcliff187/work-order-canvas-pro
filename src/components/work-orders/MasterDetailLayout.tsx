import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { X } from 'lucide-react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { cn } from '@/lib/utils';

interface MasterDetailLayoutProps {
  listContent: ReactNode;
  selectedId?: string;
  onSelectionChange: (id: string | null) => void;
  detailContent?: ReactNode;
  isLoading?: boolean;
  className?: string;
  items?: Array<{ id: string }>;
  showDetailHeader?: boolean;
}

export function MasterDetailLayout({
  listContent,
  selectedId,
  onSelectionChange,
  detailContent,
  isLoading = false,
  className,
  items = [],
  showDetailHeader = true,
}: MasterDetailLayoutProps) {
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Show detail panel when selection is made
  useEffect(() => {
    setShowDetailPanel(!!selectedId);
  }, [selectedId]);

  // Handle keyboard navigation
  const currentIndex = items.findIndex(item => item.id === selectedId);
  
  const handleArrowUp = () => {
    if (currentIndex > 0) {
      onSelectionChange(items[currentIndex - 1].id);
    }
  };

  const handleArrowDown = () => {
    if (currentIndex < items.length - 1) {
      onSelectionChange(items[currentIndex + 1].id);
    }
  };

  const handleEscape = () => {
    onSelectionChange(null);
    setShowDetailPanel(false);
  };

  useKeyboardNavigation({
    isOpen: showDetailPanel,
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onEscape: handleEscape,
  });

  const handleClosePanel = () => {
    onSelectionChange(null);
    setShowDetailPanel(false);
  };

  if (!showDetailPanel) {
    return (
      <div className={cn("w-full", className)}>
        {listContent}
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
        <ResizablePanel defaultSize={70} minSize={50}>
          <div className="h-full overflow-auto">
            {listContent}
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={30} minSize={25}>
          <div className="h-full border-l bg-background relative">
            {showDetailHeader ? (
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg">Work Order Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePanel}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClosePanel}
                className="absolute top-2 right-2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <div className="h-full overflow-auto">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              ) : (
                detailContent
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}