import React, { useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export interface AdminFilterBarProps {
  title?: string;
  filterCount?: number;
  onClear?: () => void;
  className?: string;
  children?: React.ReactNode;
  collapsible?: boolean;
  searchSlot?: React.ReactNode;
  
  sheetSide?: 'left' | 'right' | 'bottom';
  sections?: {
    essential?: React.ReactNode;
    advanced?: React.ReactNode;
  };
}

// AdminFilterBar: Enhanced, reusable wrapper that provides consistent responsive
// filter UX across all admin pages. Supports search persistence, section grouping,
// and flexible Sheet positioning for optimal mobile experience.
export function AdminFilterBar({ 
  title = 'Filters', 
  filterCount = 0, 
  onClear, 
  className, 
  children, 
  collapsible = false,
  searchSlot,
  
  sheetSide = 'right',
  sections
}: AdminFilterBarProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const hasActive = filterCount > 0;

  return (
    <div className={clsx('w-full', className)}>
      {/* Mobile: persistent search + sheet trigger */}
      <div className="space-y-3 sm:hidden">
        {/* Always visible search on mobile */}
        {searchSlot && (
          <div className="bg-card rounded-lg p-4 border shadow-sm">
            {searchSlot}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Open filters">
            {title}
            {hasActive ? ` (${filterCount})` : ''}
          </Button>
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear filters">
              Clear
            </Button>
          )}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {/* Hidden trigger; we control via state to ensure accessibility */}
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent 
          side={sheetSide} 
          className={clsx(
            'w-full',
            sheetSide === 'bottom' ? 'max-h-[85vh]' : 'sm:w-[420px]'
          )}
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6 flex-1 overflow-y-auto">
            {sections ? (
              <>
                {sections.essential && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Essential Filters</h4>
                    <div className="space-y-3">
                      {sections.essential}
                    </div>
                  </div>
                )}
                {sections.advanced && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Advanced Filters</h4>
                    <div className="space-y-3">
                      {sections.advanced}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {children}
              </div>
            )}
          </div>
          <SheetFooter className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {hasActive && (
              <Button variant="secondary" onClick={onClear}>Clear All</Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Desktop: Modern filter interface with search integration */}
      <div className="hidden sm:block space-y-6">
        {/* Always visible search on desktop */}
        {searchSlot && (
          <div className="bg-card rounded-lg p-4 border shadow-sm">
            {searchSlot}
          </div>
        )}
        
        {collapsible ? (
          <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
            <Card className="border-border/50 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-base text-foreground">{title}</h3>
                  {hasActive && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {filterCount} active
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasActive && (
                    <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-foreground">
                      Clear All
                    </Button>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                      <ChevronDown className={clsx("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1">
                <div className="p-6">
                  {sections ? (
                    <div className="space-y-8">
                      {sections.essential && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Essential Filters</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                            {sections.essential}
                          </div>
                        </div>
                      )}
                      {sections.advanced && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Advanced Filters</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                            {sections.advanced}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                      {children}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ) : (
          <Card className="border-border/50 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-base text-foreground">{title}</h3>
                {hasActive && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {filterCount} active
                  </div>
                )}
              </div>
              {hasActive && (
                <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-foreground">
                  Clear All
                </Button>
              )}
            </div>
            <div className="p-6">
              {sections ? (
                <div className="space-y-8">
                  {sections.essential && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Essential Filters</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                        {sections.essential}
                      </div>
                    </div>
                  )}
                  {sections.advanced && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Advanced Filters</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                        {sections.advanced}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                  {children}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AdminFilterBar;
