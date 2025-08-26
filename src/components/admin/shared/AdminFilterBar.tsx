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
      {/* Mobile: Search always visible + sheet trigger */}
      <div className="space-y-3 sm:hidden">
        {searchSlot && (
          <div className="w-full">
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
            sheetSide === 'bottom' ? 'h-[85vh]' : 'sm:w-[420px]'
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

      {/* Desktop: Inline card with header and actions */}
      <div className="hidden sm:block mt-3 space-y-4">
        {searchSlot && (
          <div className="w-full">
            {searchSlot}
          </div>
        )}
        {collapsible ? (
          <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm text-muted-foreground">{title}</div>
                <div className="flex items-center gap-2">
                  {hasActive && (
                    <Button variant="ghost" size="sm" onClick={onClear}>Clear All</Button>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                      <ChevronDown className={clsx("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ) : (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm text-muted-foreground">{title}</div>
              {hasActive && (
                <Button variant="ghost" size="sm" onClick={onClear}>Clear All</Button>
              )}
            </div>
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
          </Card>
        )}
      </div>
    </div>
  );
}

export default AdminFilterBar;
