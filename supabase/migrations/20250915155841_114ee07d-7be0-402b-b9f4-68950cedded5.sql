-- Data migration to fix existing receipt user identification
-- Set created_by to employee_user_id for existing receipts where created_by is null
UPDATE receipts 
SET created_by = employee_user_id,
    is_admin_entered = false
WHERE created_by IS NULL;

-- Create an index for better performance on receipts queries
CREATE INDEX IF NOT EXISTS idx_receipts_employee_user_id ON receipts(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts(created_by);

-- Update timestamps trigger to ensure updated_at is properly maintained
CREATE OR REPLACE FUNCTION update_receipt_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_updated_at();