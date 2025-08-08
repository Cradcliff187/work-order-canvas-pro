# Ops & Finance Admin Migration Plan (7 Phases)

Purpose: Track work to bring all Admin Operations & Finance pages to Gold Standard with clear status and next steps.

Status summary
- Phase 1: COMPLETE
- Phase 2: COMPLETE
- Phase 3: COMPLETE
- Phase 4: IN PROGRESS
- Phase 5: PLANNED
- Phase 6: PLANNED
- Phase 7: PLANNED

Diagram
<lov-mermaid>
graph TD
  A[Phase 1 Foundation] --> B[Phase 2 Work Orders]
  B --> C[Phase 3 Reports & Invoices]
  C --> D[Phase 4 Orgs & Partner Locations]
  D --> E[Phase 5 Employees & Permissions]
  E --> F[Phase 6 Partner Billing Polish]
  F --> G[Phase 7 A11y/Perf/Regression]
</lov-mermaid>

Phase details
1) Phase 1 – Foundation alignment (COMPLETE)
- Standardize table patterns: getRowId, selection ID correctness
- Column visibility: useColumnVisibility with v1 keys + legacyKeys migration
- Dropdowns: bg-popover + z-50 baseline across shared components
- Skeletons: EnhancedTableSkeleton

2) Phase 2 – Work Orders stabilization (COMPLETE)
- Add getRowId to WorkOrderTable
- Confirm bulk actions consume correct IDs
- Verify export disabled states and dropdowns

3) Phase 3 – Reports & Invoices stabilization (COMPLETE)
- Add getRowId to Reports & Invoices tables
- Migrate column visibility keys (admin-invoices-columns-v1; legacyKeys)
- Verify export UX, skeletons, dropdowns

4) Phase 4 – Organizations & Partner Locations (IN PROGRESS)
- Migrate visibility keys to v1 with legacyKeys
- Validate dropdown layering and skeletons
- Acceptance: preferences persist and migrate; no transparency issues; export disabled state correct

5) Phase 5 – Employees & Permissions (PLANNED)
- Apply table standards; add column visibility where applicable
- Acceptance: matches Gold Standard checklist

6) Phase 6 – Partner Billing UX polish (PLANNED)
- Validate Select Reports page on mobile, error/empty states, toast feedback
- Acceptance: meets Gold Standard and QA protocol

7) Phase 7 – Accessibility & Performance pass + Regression (PLANNED)
- Keyboard nav audit; ARIA labels; memoization review; React Query cache keys
- Regression suite: manual QA using Validation/QA protocol

Acceptance criteria (global)
- All pages in scope pass GOLD_STANDARD_ADMIN_OPS_FINANCE.md checklist
- Legacy preferences, where present, are migrated seamlessly
- No dropdown transparency; no selection ID regressions

Change log
- 2025-08-08: Marked Phases 1–3 complete; initiated Phase 4 tasks

Related docs
- Gold Standard: docs/GOLD_STANDARD_ADMIN_OPS_FINANCE.md
- Phase 3 completion record: docs/PHASE_3_OPS_FINANCE_POLISH_COMPLETE.md

Last updated: 2025-08-08