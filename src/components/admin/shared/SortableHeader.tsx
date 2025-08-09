import React from 'react';
import { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';

export interface SortableHeaderProps<TData> {
  column: Column<TData, unknown>;
  label: string;
}

export function SortableHeader<TData>({ column, label }: SortableHeaderProps<TData>) {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  const next = sorted === 'asc' ? 'descending' : 'ascending';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-2 -ml-2"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      aria-label={`Sort by ${label}${sorted ? ` (${sorted})` : ''}; toggle to ${next}`}
    >
      <span className="mr-1">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

export default SortableHeader;
