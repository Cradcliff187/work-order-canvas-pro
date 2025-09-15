-- Phase 2 Enhancements: Receipt Status & Workflow System

-- Create enum for receipt status
CREATE TYPE receipt_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- Add new columns to receipts table for Phase 2 features
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS status receipt_status DEFAULT 'submitted',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS allocated_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS allocation_percentage numeric DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_approved_by ON receipts(approved_by);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);

-- Update existing receipts to set default status
UPDATE receipts SET status = 'submitted' WHERE status IS NULL;

-- Add computed column for allocation tracking
CREATE OR REPLACE FUNCTION update_receipt_allocations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total allocated amount for the receipt
  WITH allocation_totals AS (
    SELECT 
      receipt_id,
      COALESCE(SUM(allocated_amount), 0) as total_allocated
    FROM receipt_work_orders 
    WHERE receipt_id = CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.receipt_id 
      ELSE NEW.receipt_id 
    END
    GROUP BY receipt_id
  )
  UPDATE receipts 
  SET 
    allocated_amount = allocation_totals.total_allocated,
    allocation_percentage = CASE 
      WHEN amount > 0 THEN (allocation_totals.total_allocated / amount) * 100
      ELSE 0 
    END
  FROM allocation_totals 
  WHERE receipts.id = allocation_totals.receipt_id;

  -- Handle case where all allocations are deleted
  IF TG_OP = 'DELETE' AND NOT EXISTS (
    SELECT 1 FROM receipt_work_orders WHERE receipt_id = OLD.receipt_id
  ) THEN
    UPDATE receipts 
    SET allocated_amount = 0, allocation_percentage = 0 
    WHERE id = OLD.receipt_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for allocation tracking
DROP TRIGGER IF EXISTS update_receipt_allocations_trigger ON receipt_work_orders;
CREATE TRIGGER update_receipt_allocations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON receipt_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_allocations();

-- Update existing receipts with current allocations
WITH allocation_totals AS (
  SELECT 
    r.id,
    COALESCE(SUM(rwo.allocated_amount), 0) as total_allocated
  FROM receipts r
  LEFT JOIN receipt_work_orders rwo ON r.id = rwo.receipt_id
  GROUP BY r.id
)
UPDATE receipts 
SET 
  allocated_amount = allocation_totals.total_allocated,
  allocation_percentage = CASE 
    WHEN amount > 0 THEN (allocation_totals.total_allocated / amount) * 100
    ELSE 0 
  END
FROM allocation_totals 
WHERE receipts.id = allocation_totals.id;