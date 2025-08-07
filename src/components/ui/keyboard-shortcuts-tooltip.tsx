import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const KeyboardShortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="text-sm text-muted-foreground">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-xs text-muted-foreground">+</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export const KeyboardShortcutsTooltip: React.FC = () => {
  const isMobile = useIsMobile();
  
  // Hide on mobile since keyboard shortcuts don't apply
  if (isMobile) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Show keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="w-64">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm mb-3">Keyboard Shortcuts</h4>
            <KeyboardShortcut 
              keys={[modKey, 'K']} 
              description="Focus search" 
            />
            <KeyboardShortcut 
              keys={['Esc']} 
              description="Close modals" 
            />
            <KeyboardShortcut 
              keys={[modKey, 'B']} 
              description="Toggle sidebar" 
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};