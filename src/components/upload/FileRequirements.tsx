import React from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FileRequirementsProps {
  types: string;
  size: string;
  count: number;
  mode?: 'immediate' | 'staged';
  selectionMode?: 'accumulate' | 'replace';
  currentFileCount?: number;
  layout?: 'mobile' | 'desktop';
  className?: string;
}

export function FileRequirements({
  types,
  size,
  count,
  mode = 'immediate',
  selectionMode = 'replace',
  currentFileCount = 0,
  layout = 'desktop',
  className
}: FileRequirementsProps) {
  const isMobile = layout === 'mobile';

  const content = (
    <div className="space-y-2">
      <p className="font-medium text-foreground">Upload Requirements</p>
      <div className={cn(
        "gap-2 text-muted-foreground",
        isMobile ? "grid grid-cols-1" : "grid grid-cols-3 gap-4"
      )}>
        <span>Formats: {types}</span>
        <span>Max size: {size} per file</span>
        <span>Max files: {count}</span>
      </div>
      {mode === 'staged' && currentFileCount > 0 && (
        <span className="text-primary font-medium">
          {selectionMode === 'accumulate' 
            ? `Adding to ${currentFileCount} existing files` 
            : 'New selection will replace existing files'
          }
        </span>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className={cn("text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 border", className)}>
        {content}
      </div>
    );
  }

  return (
    <Card className={cn("bg-muted/30 border-muted", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm">
            {content}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}