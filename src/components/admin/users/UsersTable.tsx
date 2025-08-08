import React from "react";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/admin/shared/TableSkeleton";

// UsersTable (Phase 1 shell)
// - Mirrors WorkOrders table wrapper pattern without wiring business logic
// - SAFE: Not imported anywhere yet; no changes to existing AdminUsers behavior
// - TODO (Phase 2): integrate @tanstack/react-table, column defs, sorting, pagination, mobile cards

export interface UsersTableProps<TData = any> {
  data?: TData[]; // TODO: wire in Phase 2
  columns?: unknown; // TODO: ColumnDef<TData, any>[] in Phase 2
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void; // TODO: connect row click in Phase 2
}

export function UsersTable<TData = any>({
  data,
  columns,
  isLoading = false,
  emptyState,
  onRowClick,
}: UsersTableProps<TData>) {
  return (
    <Card className="p-4">
      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {emptyState ?? "Users table will appear here."}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {/* TODO: Replace with table rendering using columns + data to mirror WorkOrders standard */}
          Users table placeholder (Phase 1).
        </div>
      )}
    </Card>
  );
}

export default UsersTable;
