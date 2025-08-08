import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/enhanced-skeleton';

// TimeReportsTable: base shell following WorkOrders standard
// TODO: Implement full table with sorting, pagination, column visibility, export, and mobile cards.

export interface TimeReportsTableProps<TData = any> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  // TODO: Add pagination, sorting, selection, and view mode props to mirror WorkOrders
}

export function TimeReportsTable<TData = any>({ data, columns, isLoading }: TimeReportsTableProps<TData>) {
  return (
    <Card className="p-4">
      {/* TODO: Mirror Admin WorkOrders table with master-detail + column visibility + export */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={5} showHeader />
      ) : (
        <div className="text-sm text-muted-foreground">
          TimeReports table placeholder
        </div>
      )}
    </Card>
  );
}
