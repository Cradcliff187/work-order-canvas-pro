import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  title,
  children,
  defaultOpen = false,
  badge,
  icon,
  isOpen,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{title}</h3>
            {badge}
          </div>
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? 'transform rotate-180' : ''
          }`} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="p-4 pt-2 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};