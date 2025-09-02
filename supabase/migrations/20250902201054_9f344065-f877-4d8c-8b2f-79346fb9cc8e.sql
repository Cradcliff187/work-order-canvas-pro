-- Add performance columns to subcontractor_bills table
-- First, temporarily disable validation trigger if it exists
DO $$ 
BEGIN
    -- Drop validation trigger temporarily if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_subcontractor_bill_fields_trigger') THEN
        DROP TRIGGER validate_subcontractor_bill_fields_trigger ON subcontractor_bills;
    END IF;
END $$;

-- Add the new status columns
ALTER TABLE subcontractor_bills 
ADD COLUMN IF NOT EXISTS operational_status TEXT,
ADD COLUMN IF NOT EXISTS partner_billing_status TEXT;

-- Fix the record with null external_bill_number first
UPDATE subcontractor_bills 
SET external_bill_number = COALESCE(external_bill_number, internal_bill_number, 'TEMP-' || id::text)
WHERE external_bill_number IS NULL OR trim(external_bill_number) = '';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subcontractor_bills_operational_status ON subcontractor_bills(operational_status);
CREATE INDEX IF NOT EXISTS idx_subcontractor_bills_partner_billing_status ON subcontractor_bills(partner_billing_status);
CREATE INDEX IF NOT EXISTS idx_subcontractor_bills_status_combo ON subcontractor_bills(operational_status, partner_billing_status);

-- Update operational_status based on current status (no unknown)
UPDATE subcontractor_bills SET operational_status = 
  CASE status
    WHEN 'paid' THEN 'paid'
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'submitted' THEN 'pending_approval'
    WHEN 'draft' THEN 'draft'
    ELSE status  -- fallback to original status instead of 'unknown'
  END
WHERE operational_status IS NULL;

-- Update partner_billing_status based on main status (corrected logic)
UPDATE subcontractor_bills SET partner_billing_status = 
  CASE status
    WHEN 'paid' THEN 'billed'
    WHEN 'approved' THEN 'ready'
    WHEN 'submitted' THEN 'pending'
    WHEN 'rejected' THEN 'pending'
    WHEN 'draft' THEN 'not_applicable'
    ELSE 'not_applicable'
  END
WHERE partner_billing_status IS NULL;

-- Create trigger function with corrected logic
CREATE OR REPLACE FUNCTION update_subcontractor_bill_status_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Update operational_status (no unknown)
  NEW.operational_status := CASE NEW.status
    WHEN 'paid' THEN 'paid'
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'submitted' THEN 'pending_approval'
    WHEN 'draft' THEN 'draft'
    ELSE NEW.status  -- fallback to original status
  END;
  
  -- Update partner_billing_status (corrected logic)
  NEW.partner_billing_status := CASE NEW.status
    WHEN 'paid' THEN 'billed'
    WHEN 'approved' THEN 'ready'
    WHEN 'submitted' THEN 'pending'
    WHEN 'rejected' THEN 'pending'
    WHEN 'draft' THEN 'not_applicable'
    ELSE 'not_applicable'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_subcontractor_bill_status_columns ON subcontractor_bills;
CREATE TRIGGER trigger_update_subcontractor_bill_status_columns
  BEFORE INSERT OR UPDATE ON subcontractor_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontractor_bill_status_columns();

-- Recreate validation trigger if needed
DROP TRIGGER IF EXISTS validate_subcontractor_bill_fields_trigger ON subcontractor_bills;
CREATE TRIGGER validate_subcontractor_bill_fields_trigger
  BEFORE INSERT OR UPDATE ON subcontractor_bills
  FOR EACH ROW
  EXECUTE FUNCTION validate_subcontractor_bill_fields();

-- Show results
SELECT 
  'Total bills updated' as description,
  COUNT(*) as count
FROM subcontractor_bills
WHERE operational_status IS NOT NULL AND partner_billing_status IS NOT NULL;

-- Show status distribution
SELECT 
  status as original_status,
  operational_status,
  partner_billing_status,
  COUNT(*) as count
FROM subcontractor_bills 
GROUP BY status, operational_status, partner_billing_status
ORDER BY count DESC;