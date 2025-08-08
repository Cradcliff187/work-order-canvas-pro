import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface QuickFiltersBarProps {
  onQuickFilter?: (filter: 'submitted' | 'approved' | 'paid' | 'rejected') => void;
  counts?: Partial<Record<'submitted' | 'approved' | 'paid' | 'rejected', number>>;
  className?: string;
}

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({ onQuickFilter, counts = {}, className }) => {
  const items: Array<{ key: 'submitted' | 'approved' | 'paid' | 'rejected'; label: string }>
    = [
      { key: 'submitted', label: 'Submitted' },
      { key: 'approved', label: 'Approved' },
      { key: 'paid', label: 'Paid' },
      { key: 'rejected', label: 'Rejected' },
    ];

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {items.map(({ key, label }) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          onClick={() => onQuickFilter?.(key)}
          aria-label={`Filter invoices by ${label}`}
          className="gap-2"
       >
          <span>{label}</span>
          {typeof counts[key] === 'number' && (
            <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
              {counts[key]}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
};
