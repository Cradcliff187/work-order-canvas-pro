import React, { useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';

export interface AdminFilterBarProps {
  title?: string;
  filterCount?: number;
  onClear?: () => void;
  className?: string;
  children?: React.ReactNode;
}

// AdminFilterBar: A lightweight, reusable wrapper that provides the same responsive
// filter UX pattern as Work Orders (mobile sheet + desktop grid).
// It renders no data-fetching logic; consumers pass their filter controls as children.
export function AdminFilterBar({ title = 'Filters', filterCount = 0, onClear, className, children }: AdminFilterBarProps) {
  const [open, setOpen] = useState(false);
  const hasActive = filterCount > 0;

  return (
    <div className={clsx('w-full', className)}>
      {/* Mobile: Sheet trigger */}
      <div className="flex items-center justify-between sm:hidden">
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {/* Hidden trigger; we control via state to ensure accessibility */}
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {children}
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
      <Card className="hidden sm:block p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-sm text-muted-foreground">{title}</div>
          {hasActive && (
            <Button variant="ghost" size="sm" onClick={onClear}>Clear All</Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {children}
        </div>
      </Card>
    </div>
  );
}

export default AdminFilterBar;
