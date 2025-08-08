import type { ColumnDef } from '@tanstack/react-table';

// ReceiptsColumns (Phase 1 shell)
// - Mirror WorkOrders pattern without implementation
// - TODO: Implement sortable headers, cell formatting, and actions in Phase 2

export type Receipt = {
  id: string;
  // TODO: Add entity-specific fields (e.g., receipt_number, vendor_name, amount, date, work_order_number, status, attachments)
};

export interface ReceiptColumnProps {
  // Optional callbacks for row-level actions to be wired in Phase 2
  onView?: (receipt: Receipt) => void;
}

export function createReceiptColumns(_props: ReceiptColumnProps = {}): ColumnDef<Receipt>[] {
  // TODO: Return ColumnDef[] mirroring WorkOrders columns (no business logic changes)
  return [];
}
