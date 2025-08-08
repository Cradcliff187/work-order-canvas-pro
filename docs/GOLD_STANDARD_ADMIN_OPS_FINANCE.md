# Admin Operations & Finance Gold Standard

Purpose: Single source of truth for standards applied to Admin Ops & Finance pages.

Scope (pages)
- Work Orders
- Reports
- Invoices
- Organizations
- Partner Locations
- Employees
- Partner Billing → Select Reports

Core principles (required)
1) Tables & selection
- Stable identity: use getRowId: (row) => row.id in useReactTable
- Selection: rowSelection keys must be IDs, not indices
- Bulk actions must consume true IDs

2) Column visibility persistence
- Hook: src/hooks/useColumnVisibility.ts
- Keys: admin-<page>-columns-v1 (e.g., admin-invoices-columns-v1)
- Migrations: pass legacyKeys to auto-migrate prior keys

3) Dropdowns
- Must render opaque with proper layering: className includes z-50 bg-popover
- Use DropdownMenu* components consistently

4) Export UX
- Use ExportDropdown with disabled when loading or no rows
- Supported formats: CSV, Excel

5) Loading, empty, error states
- Loading: EnhancedTableSkeleton (src/components/EnhancedTableSkeleton.tsx)
- Empty: descriptive copy + clear call to action
- Error: non-technical message + Retry action

6) Filters & search
- Visible, resettable (Clear filters)
- Persisted where applicable

7) Accessibility
- Single H1 per page
- Buttons and menus with aria-labels and sr-only text where appropriate
- Keyboard navigable menus and controls

8) Performance
- Memoize heavy derived data
- Avoid unnecessary re-renders; stable callbacks
- React Query for server data with cache keys per filter state

9) Design system & responsiveness
- Use semantic tokens (tailwind theme) only; avoid hardcoded colors
- Responsive tables (cards on mobile where needed)

Checklists by page
- Work Orders: getRowId set; column visibility key standardized; dropdowns opaque; export disabled states correct; skeletons present; filters resettable. Status: COMPLETE.
- Reports: getRowId set; column visibility key standardized; export disabled states; dropdowns; skeletons. Status: COMPLETE.
- Invoices: getRowId set; column visibility migration to admin-invoices-columns-v1; export UX; skeletons; dropdowns. Status: COMPLETE.
- Organizations: column visibility key standardized to admin-organizations-columns-v1 with legacyKeys; dropdowns; skeletons standardized (EnhancedTableSkeleton). Status: IN PROGRESS — loading skeleton standardized.
- Partner Locations: column visibility key standardized to admin-partner-locations-columns-v1 with legacyKeys; dropdowns; skeletons standardized (EnhancedTableSkeleton). Status: IN PROGRESS — loading skeleton standardized.
- Employees: align selection, dropdowns, skeletons if applicable. Status: PLANNED.
- Partner Billing → Select Reports: selection, totals UX, confirmation dialog, disabled states when empty/loading. Status: COMPLETE (Phase 3 validation).

Validation/QA protocol (quick pass)
- Verify selection across pagination retains IDs
- Toggle columns; reload page; preferences persist
- Open all dropdowns; ensure background not transparent and on top of modals
- Export when 0 rows → disabled; during loading → disabled
- Keyboard: navigate to actions menu, open/close with Enter/Escape, move with arrows
- Mobile: table converts to cards, critical data remains visible

Maintenance
- When creating a new admin table, copy an existing v1 table as template
- Always register new column-visibility key as admin-<page>-columns-v1
- Document deviations in OPS_FINANCE_MIGRATION_PLAN.md

Links
- Migration plan: docs/OPS_FINANCE_MIGRATION_PLAN.md
- Phase 3 completion record: docs/PHASE_3_OPS_FINANCE_POLISH_COMPLETE.md

Last updated: 2025-08-08