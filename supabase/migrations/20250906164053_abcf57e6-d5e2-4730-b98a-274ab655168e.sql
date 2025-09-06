-- Phase 1: Database Schema Enhancement for Partner Invoices
-- Add columns for PDF storage, email tracking, and payment management

-- Add new columns to partner_invoices table
ALTER TABLE partner_invoices 
ADD COLUMN pdf_url TEXT,
ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_date DATE,
ADD COLUMN payment_reference TEXT;

-- Create audit trigger function for partner invoice status changes
CREATE OR REPLACE FUNCTION audit_partner_invoice_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status actually changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      'partner_invoices',
      NEW.id,
      'status_change',
      jsonb_build_object(
        'status', OLD.status,
        'sent_at', OLD.sent_at,
        'payment_date', OLD.payment_date
      ),
      jsonb_build_object(
        'status', NEW.status,
        'sent_at', NEW.sent_at,
        'payment_date', NEW.payment_date
      ),
      auth_profile_id_safe()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for partner invoice audit logging
DROP TRIGGER IF EXISTS partner_invoice_audit_trigger ON partner_invoices;
CREATE TRIGGER partner_invoice_audit_trigger
  AFTER UPDATE ON partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION audit_partner_invoice_status_changes();

-- Add comment for documentation
COMMENT ON COLUMN partner_invoices.pdf_url IS 'URL to generated PDF invoice file in Supabase Storage';
COMMENT ON COLUMN partner_invoices.sent_at IS 'Timestamp when invoice was emailed to partner';
COMMENT ON COLUMN partner_invoices.payment_date IS 'Date when payment was received from partner';
COMMENT ON COLUMN partner_invoices.payment_reference IS 'Payment method or reference number for tracking';