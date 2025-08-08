import React from "react";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/admin/shared/TableSkeleton";

// OrganizationsTable (Phase 1 shell)
// - Mirrors WorkOrders table wrapper pattern without wiring business logic
// - SAFE: Not imported anywhere yet; no changes to existing AdminOrganizations behavior
// - TODO (Phase 2): integrate @tanstack/react-table, column defs, sorting, pagination, mobile cards

export interface OrganizationsTableProps<TData = any> {
  data?: TData[]; // TODO: wire in Phase 2
  columns?: unknown; // TODO: ColumnDef<TData, any>[] in Phase 2
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void; // TODO: connect row click in Phase 2
}

export function OrganizationsTable<TData = any>({
  data,
  columns,
  isLoading = false,
  emptyState,
  onRowClick,
}: OrganizationsTableProps<TData>) {
  return (
    <Card className="p-4">
      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {emptyState ?? "Organizations table will appear here."}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {/* TODO: Replace with table rendering using columns + data to mirror WorkOrders standard */}
          Organizations table placeholder (Phase 1).
        </div>
      )}
    </Card>
  );
}

export default OrganizationsTable;
