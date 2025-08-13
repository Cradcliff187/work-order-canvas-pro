import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { X } from 'lucide-react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
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
  detailTitle?: string;
  headerActions?: ReactNode;
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
  detailTitle = "Details",
  headerActions,
}: MasterDetailLayoutProps) {
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const isMobile = useIsMobile();

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

  // Mobile: Stack layout
  if (isMobile) {
    return (
      <div className={cn("w-full h-full", className)}>
        <div className="h-full flex flex-col overflow-hidden">
          {/* Detail header */}
          {showDetailHeader && (
            <div className="flex items-center justify-between p-4 border-b bg-background">
              <h3 className="font-semibold text-lg">{detailTitle}</h3>
              <div className="flex items-center gap-2">
                {headerActions}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePanel}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Detail content */}
          <div className="flex-1 overflow-auto">
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
      </div>
    );
  }

  // Desktop: Resizable panels
  return (
    <div className={cn("w-full h-full", className)}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
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
                <h3 className="font-semibold text-lg">{detailTitle}</h3>
                <div className="flex items-center gap-2">
                  {headerActions}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClosePanel}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
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