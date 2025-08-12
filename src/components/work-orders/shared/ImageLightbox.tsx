import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AttachmentItem as GridAttachmentItem } from '@/components/work-orders/shared/AttachmentGrid';
import { getImageUrl } from '@/utils/fileUtils';

interface ImageLightboxProps {
  open: boolean;
  onClose: () => void;
  items: GridAttachmentItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onDownload?: (item: GridAttachmentItem) => void;
}

export function ImageLightbox({ open, onClose, items, index, onIndexChange, onDownload }: ImageLightboxProps) {
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const current = items[index];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, index, hasPrev, hasNext, onClose, onIndexChange]);

  if (!current) return null;

  const imgUrl = getImageUrl(current.file_url);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(
        'max-w-[95vw] md:max-w-[90vw] lg:max-w-[80vw] h-[85vh] p-0 overflow-hidden bg-background'
      )}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="shrink-0">Image</Badge>
            <div className="truncate text-sm" title={current.file_name}>{current.file_name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Download image"
              onClick={() => onDownload?.(current)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative h-full bg-muted">
          <img
            src={imgUrl}
            alt={current.file_name}
            className="absolute inset-0 w-full h-full object-contain"
          />

          {/* Nav buttons */}
          <div className="absolute inset-y-0 left-0 flex items-center p-2">
            <Button
              variant="secondary"
              size="icon"
              className="opacity-90"
              aria-label="Previous image"
              disabled={!hasPrev}
              onClick={() => hasPrev && onIndexChange(index - 1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center p-2">
            <Button
              variant="secondary"
              size="icon"
              className="opacity-90"
              aria-label="Next image"
              disabled={!hasNext}
              onClick={() => hasNext && onIndexChange(index + 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
