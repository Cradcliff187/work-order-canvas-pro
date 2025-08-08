import React from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// PartnerLocationFilters: base shell following WorkOrders standard
// TODO (Phase 2): Replace placeholders with SmartSearchInput, MultiSelectFilter, DateRange, etc.

export interface PartnerLocationFiltersProps {
  value?: Record<string, unknown>;
  onChange?: (next: Record<string, unknown>) => void;
  className?: string;
}

export function PartnerLocationFilters({ value, onChange, className }: PartnerLocationFiltersProps) {
  return (
    <div className={clsx('w-full', className)}>
      <Card className="p-3 flex items-center gap-2">
        {/* TODO: Wire to debounced search + server filters. Keep parity with WorkOrders UX. */}
        <Input
          placeholder="Search locations... (placeholder)"
          aria-label="Search partner locations"
          onChange={() => {
            /* no-op placeholder: implement in Phase 2 */
          }}
        />
        <Button type="button" variant="outline" disabled>
          Filters
        </Button>
      </Card>
    </div>
  );
}

export default PartnerLocationFilters;
