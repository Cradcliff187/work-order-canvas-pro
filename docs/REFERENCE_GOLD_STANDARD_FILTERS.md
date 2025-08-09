# Gold Standard: Admin Filters

This reference defines the minimum filter set and UX conventions for Operations, Management, and Finance admin pages.

Core UX rules
- Consistent controls: OrganizationSelector (single), MultiSelectFilter (multi), date inputs/Calendar, amount min/max
- Accessibility: keyboard navigable; popovers z-50; date popovers pointer-events-auto
- Persistence: store page-specific filters in localStorage
- Clear button: always present when any filter is active

Work Orders
- Filters: search, status[], trade[], organization_id, organization_type[], location[], date range

Invoices (Subcontractor)
- Filters: search, status[], payment_status, subcontractor_organization_id, date range, due date range, amount range, has_attachments, overdue

Partner Billing
- Required: partner organization selector

Receipts (Admin Finance)
- Filters: search, uploaded_by (optional), organization_id, organization_type[], date range, amount range, work_order_id, has_attachment, allocation_status[], category (if supported)

Users (Management)
- Filters: search, role[], status[], organization_id, organization_type[], created range, last_login range (if supported), has_recent_activity, has_never_logged_in

Billing Dashboard — Transactions
- Filters: search, transaction_type[], organization_id, date range, amount range

QA checklist
- Filters persist and coexist with sorting/pagination
- Date pickers interactive inside popovers
- Receipts allocation filters: unallocated/partial/full correct
- Users org filters match memberships; last_login handled gracefully
- Transactions load with paid invoices at minimum
