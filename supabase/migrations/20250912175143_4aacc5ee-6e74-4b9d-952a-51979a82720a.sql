-- Drop existing combined AFTER trigger
DROP TRIGGER IF EXISTS partner_invoice_audit_trigger ON public.partner_invoices;

-- Ensure any prior split triggers are dropped to avoid duplicates
DROP TRIGGER IF EXISTS partner_invoice_audit_trigger_aiu ON public.partner_invoices;
DROP TRIGGER IF EXISTS partner_invoice_audit_trigger_bd ON public.partner_invoices;

-- Recreate as two triggers:
-- AFTER for INSERT/UPDATE (safe for FK since parent exists)
CREATE TRIGGER partner_invoice_audit_trigger_aiu
  AFTER INSERT OR UPDATE ON public.partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_partner_invoice_changes();

-- BEFORE for DELETE (write audit row while parent still exists)
CREATE TRIGGER partner_invoice_audit_trigger_bd
  BEFORE DELETE ON public.partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_partner_invoice_changes();