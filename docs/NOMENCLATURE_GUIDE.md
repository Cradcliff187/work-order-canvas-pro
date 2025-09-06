# Nomenclature Guide for WorkOrderPortal

## Overview
Due to historical evolution of the system, there are some naming inconsistencies in the codebase. This guide explains the current state and correct terminology.

## Correct Business Terminology

### What We Receive (Incoming)
- **Subcontractor Bills** - Bills/invoices we RECEIVE FROM subcontractors for work performed
  - Database table: `subcontractor_bills` ✅
  - User-facing term: "Bills" ✅
  - Internal variable names: Sometimes called "invoices" (legacy)

### What We Send (Outgoing)  
- **Partner Invoices** - Invoices we SEND TO partner organizations for completed work
  - Database table: `partner_invoices` ✅
  - User-facing term: "Partner Invoices" ✅
  - Internal variable names: Correct ✅

## Component Naming Discrepancies

| Component File | Actual Purpose | Why Not Renamed |
|---------------|---------------|-----------------|
| `EditInvoiceSheet.tsx` | Edits subcontractor BILLS | Renaming would break imports |
| `InvoiceDetailModal.tsx` | Shows subcontractor BILL details | Renaming would break imports |
| `InvoiceColumns.tsx` | Defines columns for BILLS table | Renaming would break imports |
| `InvoiceFilters.tsx` | Filters for subcontractor BILLS | Shared with actual invoices |

## Variable Naming Patterns

### In SubcontractorBills.tsx
- `invoiceToEdit` - Actually refers to a bill
- `INVOICE_COLUMN_METADATA` - Actually defines bill columns
- These are kept for stability - renaming would cascade through many files

### In Hooks
- `invoice_status` - Actually refers to bill status
- `reportsWithPendingInvoices` - Actually refers to bills

## Database Schema (Correct)
The database uses correct terminology:
- `subcontractor_bills` - Correct ✅
- `partner_invoices` - Correct ✅
- `subcontractor_bill_work_orders` - Correct ✅
- `partner_invoice_line_items` - Correct ✅

## For Developers

### When Writing New Code
- Use "bill" or "subcontractorBill" for bills from subcontractors
- Use "invoice" or "partnerInvoice" for invoices to partners
- Add clarifying comments when using legacy named components

### Example Comments to Add
```typescript
// This component handles subcontractor BILLS despite the name
import { EditInvoiceSheet } from '@/components/admin/invoices/EditInvoiceSheet';

// Note: 'invoice' prop actually contains a subcontractor bill
<EditInvoiceSheet invoice={selectedBill} />
```

## Future Refactoring Considerations
When the system is more stable, consider:
1. Renaming components to match their actual purpose
2. Updating variable names to use consistent terminology
3. Creating separate component directories for bills vs invoices
4. Updating all user-facing text to use correct terminology consistently

---
*Last updated: 2025-01-09*