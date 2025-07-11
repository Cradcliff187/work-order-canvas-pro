-- Phase 1: Database schema updates for invoice drafts

-- Update invoices table to allow NULL values for required fields when status='draft'
ALTER TABLE invoices 
  ALTER COLUMN submitted_at DROP NOT NULL,
  ALTER COLUMN submitted_by DROP NOT NULL,
  ALTER COLUMN subcontractor_organization_id DROP NOT NULL,
  ALTER COLUMN total_amount DROP NOT NULL;

-- Add a check to ensure required fields are present for submitted invoices
CREATE OR REPLACE FUNCTION validate_invoice_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- For submitted invoices, ensure required fields are present
  IF NEW.status = 'submitted' THEN
    IF NEW.submitted_at IS NULL OR 
       NEW.submitted_by IS NULL OR 
       NEW.subcontractor_organization_id IS NULL OR 
       NEW.total_amount IS NULL THEN
      RAISE EXCEPTION 'Required fields missing for submitted invoice';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice validation
DROP TRIGGER IF EXISTS validate_invoice_fields_trigger ON invoices;
CREATE TRIGGER validate_invoice_fields_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_fields();

-- Update the invoice number generation trigger to only generate for submitted invoices
CREATE OR REPLACE FUNCTION trigger_generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate internal invoice number for submitted invoices
  IF NEW.status = 'submitted' AND (NEW.internal_invoice_number IS NULL OR NEW.internal_invoice_number = '') THEN
    NEW.internal_invoice_number := public.generate_internal_invoice_number();
  ELSIF NEW.status = 'draft' THEN
    -- For drafts, leave internal_invoice_number empty
    NEW.internal_invoice_number := '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies to handle draft invoices
CREATE POLICY "Subcontractors can create draft invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_type() = 'subcontractor' 
    AND status = 'draft'
    AND (
      subcontractor_organization_id IS NULL 
      OR auth_user_belongs_to_organization(subcontractor_organization_id)
    )
  );

-- Allow subcontractors to view their draft invoices
DROP POLICY IF EXISTS "Subcontractors can view their invoices" ON invoices;
CREATE POLICY "Subcontractors can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    auth_user_type() = 'subcontractor' 
    AND (
      (status = 'draft' AND submitted_by = auth_profile_id()) OR
      (status != 'draft' AND auth_user_belongs_to_organization(subcontractor_organization_id))
    )
  );

-- Allow subcontractors to delete their draft invoices
CREATE POLICY "Subcontractors can delete their draft invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    auth_user_type() = 'subcontractor' 
    AND status = 'draft' 
    AND submitted_by = auth_profile_id()
  );