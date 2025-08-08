import type { ColumnDef } from '@tanstack/react-table';

// TimeReportsColumns (Phase 1 shell)
// - Copy of WorkOrders pattern without implementation
// - TODO: Implement sortable headers, cell formatting, and actions in Phase 2

export type TimeReport = {
  id: string;
  // TODO: Add entity-specific fields (e.g., work_order_number, report_date, hours_worked, notes)
};

export interface TimeReportColumnProps {
  // Optional callbacks for row-level actions to be wired in Phase 2
  onView?: (report: TimeReport) => void;
}

export function createTimeReportColumns(_props: TimeReportColumnProps = {}): ColumnDef<TimeReport>[] {
  // TODO: Return ColumnDef[] mirroring WorkOrders columns (no business logic changes)
  return [];
}

