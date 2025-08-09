# Ops & Finance Admin Migration Plan (7 Phases)

Purpose: Track work to bring all Admin Operations & Finance pages to Gold Standard with clear status and next steps.

5: Status summary
6: - Phase 1: COMPLETE
7: - Phase 2: COMPLETE
8: - Phase 3: COMPLETE
9: - Phase 4: COMPLETE
10: - Phase 5: COMPLETE
11: - Phase 6: COMPLETE
12: - Phase 7: COMPLETE
13: 
14: Diagram
15: <lov-mermaid>
16: graph TD
17:   A[Phase 1 Foundation] --> B[Phase 2 Work Orders]
18:   B --> C[Phase 3 Reports & Invoices]
19:   C --> D[Phase 4 Orgs & Partner Locations]
20:   D --> E[Phase 5 Employees & Permissions]
21:   E --> F[Phase 6 Partner Billing Polish]
22:   F --> G[Phase 7 A11y/Perf/Regression]
23: </lov-mermaid>
24: 
25: Phase details
26: 1) Phase 1 – Foundation alignment (COMPLETE)
27: - Standardize table patterns: getRowId, selection ID correctness
28: - Column visibility: useColumnVisibility with v1 keys + legacyKeys migration
29: - Dropdowns: bg-popover + z-50 baseline across shared components
30: - Skeletons: EnhancedTableSkeleton
31: 
32: 2) Phase 2 – Work Orders stabilization (COMPLETE)
33: - Add getRowId to WorkOrderTable
34: - Confirm bulk actions consume correct IDs
35: - Verify export disabled states and dropdowns
36: 
37: 3) Phase 3 – Reports & Invoices stabilization (COMPLETE)
38: - Add getRowId to Reports & Invoices tables
39: - Migrate column visibility keys (admin-invoices-columns-v1; legacyKeys)
40: - Verify export UX, skeletons, dropdowns
41: 
42: 4) Phase 4 – Organizations & Partner Locations (COMPLETE)
43: - Migrated visibility keys to v1 with legacyKeys
44: - Verified dropdown layering (z-50 bg-popover) and standardized skeletons
45: - Added accessibility improvements (keyboard row open, aria-labels on actions)
46: - Acceptance: preferences persist/migrate; no transparency issues; export disabled state correct
47: 
48: 5) Phase 5 – Employees & Permissions (COMPLETE)
49: - Apply table standards; add column visibility where applicable
50: - Acceptance: matches Gold Standard checklist; keyboard row activation implemented for Users and Employees
51: 
52: 6) Phase 6 – Partner Billing UX polish (COMPLETE)
53: - Implemented standardized skeletons, retryable error states, toasts, a11y tweaks
54: - Acceptance: meets Gold Standard and QA protocol
55: 
56: 7) Phase 7 – Accessibility & Performance pass + Regression (COMPLETE)
57: - Keyboard nav audit; ARIA labels; memoization review; React Query cache keys
58: - Regression suite: manual QA using Validation/QA protocol
59: 
60: Acceptance criteria (global)
61: - All pages in scope pass GOLD_STANDARD_ADMIN_OPS_FINANCE.md checklist
62: - Legacy preferences, where present, are migrated seamlessly
63: - No dropdown transparency; no selection ID regressions
64: 
Change log
- 2025-08-08: Marked Phases 1–3 complete; initiated Phase 4 tasks
- 2025-08-08: Standardized EnhancedTableSkeleton on Organizations and Partner Locations; removed full-page LoadingSpinner from Partner Locations page
- 2025-08-08: Marked Phase 4 complete; added a11y tweaks and export disabled states.
- 2025-08-08: Completed Phase 5 – Employees & Permissions; added keyboard row accessibility for Admin Users and Employees; validated loading/empty/error and export disabled states.
- 2025-08-09: Finalized Phase 6 micro-cleanups (friendly error, consolidated toasts); kicked off Phase 7 with initial layering/a11y on Select Reports.
- 2025-08-09: Completed Phase 7 – Ops & Finance: centralized dropdown layering, friendly error + Retry across pages, export disabled checks, mobile card a11y parity, minor memoization; updated docs and QA.
- 2025-08-09: Completed Phase 8 – Management: friendly error + Retry on Organizations, Employees, Partner Locations; verified dropdown layering, export disabled checks, a11y parity; added docs.
Related docs
- Gold Standard: docs/GOLD_STANDARD_ADMIN_OPS_FINANCE.md
- Phase 3 completion record: docs/PHASE_3_OPS_FINANCE_POLISH_COMPLETE.md

Last updated: 2025-08-09