// Import the correct type
import type { SubcontractorBill } from '@/hooks/useSubcontractorBills';

// Type alias for backward compatibility
/**
 * @deprecated Use SubcontractorBill instead
 * This type alias exists for backward compatibility only.
 * New code should use SubcontractorBill directly.
 * 
 * Historical context: This codebase previously used "invoice" terminology
 * for subcontractor bills, causing confusion with partner invoices.
 * The correct terminology is now:
 * - SubcontractorBill: Bills we RECEIVE FROM subcontractors for work performed
 * - PartnerInvoice: Invoices we SEND TO partner organizations for completed work
 * 
 * See docs/NOMENCLATURE_GUIDE.md for more details.
 */
export type SubcontractorInvoice = SubcontractorBill;

// Re-export the correct type for convenience
export type { SubcontractorBill } from '@/hooks/useSubcontractorBills';