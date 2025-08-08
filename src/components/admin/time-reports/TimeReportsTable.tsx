import React from 'react';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/enhanced-skeleton';

// TimeReportsTable (Phase 1 shell)
// - Mirrors WorkOrders structure without implementing logic yet
// - TODO: Add react-table sorting/pagination and row click behavior in Phase 2
// - TODO: Replace placeholder types with ColumnDef-based table once columns are defined

export interface TimeReportsTableProps<TData = any> {
  data?: TData[]; // TODO: wire in Phase 2
  columns?: unknown; // TODO: ColumnDef<TData, any>[] in Phase 2
  isLoading?: boolean;
  onRowClick?: (row: TData) => void; // TODO: connect in Phase 2
}

export function TimeReportsTable<TData = any>({ data, columns, isLoading = false, onRowClick }: TimeReportsTableProps<TData>) {
  // Presentational shell only. Keep business logic unchanged for Phase 1.
  return (
    <Card className="p-4">
      {isLoading ? (
        <TableSkeleton rows={6} columns={5} showHeader />
      ) : (
        <div className="text-sm text-muted-foreground">
          {/* TODO: Replace with table rendering and actions to mirror WorkOrders */}
          Time Reports table will appear here.
        </div>
      )}
    </Card>
  );
}
