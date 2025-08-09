# Admin Management Gold Standard

Purpose: Ensure Users, Organizations, Partner Locations, and Employees pages meet the same quality bar as Ops & Finance.

Scope
- Users
- Organizations
- Partner Locations
- Employees

Checklist
- Tables & Selection
  - Stable getRowId returns true IDs; bulk actions use real IDs across pagination.
- Column Visibility Persistence
  - Keys: admin-<page>-columns-v1; migrate legacy keys if present.
- Dropdowns & Menus
  - Opaque menus with bg-popover and z-50; appear above dialogs/overlays.
- Export UX
  - ExportDropdown disabled while loading or when 0 rows; CSV/Excel supported.
- Loading / Empty / Error States
  - Loading: EnhancedTableSkeleton
  - Empty: descriptive copy + primary action when applicable
  - Error: friendly copy (no technical error) + Retry button that triggers refetch
- Filters & Search
  - Visible, resettable; persist where applicable.
- Accessibility
  - Single H1 per page; keyboardable rows and MobileTableCard (Enter/Space)
  - Icon-only actions have aria-labels; focus states clearly visible
- Performance
  - Memoize heavy derived data; stable callbacks; sane React Query keys and staleTime
- Responsiveness
  - Mobile card parity for critical data and action affordances

Validation/QA Quick Pass
- Toggle column visibility; reload → persists
- Menus are opaque and above overlays; no transparency
- Export disabled during loading/0 rows
- Error → friendly copy; Retry refetches
- Keyboard navigation works across table rows, menus, and mobile cards

Last updated: 2025-08-09
