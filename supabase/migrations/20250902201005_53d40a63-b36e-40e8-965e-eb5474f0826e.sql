-- Add performance columns to subcontractor_bills table
ALTER TABLE subcontractor_bills 
ADD COLUMN operational_status TEXT,
ADD COLUMN partner_billing_status TEXT;

-- Create indexes for performance
CREATE INDEX idx_subcontractor_bills_operational_status ON subcontractor_bills(operational_status);
CREATE INDEX idx_subcontractor_bills_partner_billing_status ON subcontractor_bills(partner_billing_status);
CREATE INDEX idx_subcontractor_bills_status_combo ON subcontractor_bills(operational_status, partner_billing_status);

-- Update operational_status based on current status (no unknown)
UPDATE subcontractor_bills SET operational_status = 
  CASE status
    WHEN 'paid' THEN 'paid'
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'submitted' THEN 'pending_approval'
    WHEN 'draft' THEN 'draft'
    ELSE status  -- fallback to original status instead of 'unknown'
  END;

-- Update partner_billing_status based on main status (corrected logic)
UPDATE subcontractor_bills SET partner_billing_status = 
  CASE status
    WHEN 'paid' THEN 'billed'
    WHEN 'approved' THEN 'ready'
    WHEN 'submitted' THEN 'pending'
    WHEN 'rejected' THEN 'pending'
    WHEN 'draft' THEN 'not_applicable'
    ELSE 'not_applicable'
  END;

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
CREATE TRIGGER trigger_update_subcontractor_bill_status_columns
  BEFORE INSERT OR UPDATE ON subcontractor_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontractor_bill_status_columns();

-- Show update results
SELECT 
  'Total bills updated' as description,
  COUNT(*) as count
FROM subcontractor_bills
WHERE operational_status IS NOT NULL;

-- Show status distribution
SELECT 
  status as original_status,
  operational_status,
  partner_billing_status,
  COUNT(*) as count
FROM subcontractor_bills 
GROUP BY status, operational_status, partner_billing_status
ORDER BY count DESC;