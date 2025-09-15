-- Create enum type for partner invoice line item source types
CREATE TYPE partner_invoice_line_item_source_type AS ENUM (
  'subcontractor_bill',
  'internal_work', 
  'employee_time',
  'other'
);

-- Add source_type column to partner_invoice_line_items
ALTER TABLE partner_invoice_line_items 
ADD COLUMN source_type partner_invoice_line_item_source_type;

-- Backfill existing records based on current patterns
UPDATE partner_invoice_line_items 
SET source_type = CASE
  -- If it has a work_order_report_id, it's from internal work
  WHEN work_order_report_id IS NOT NULL THEN 'internal_work'::partner_invoice_line_item_source_type
  -- Check description patterns for subcontractor bills
  WHEN description IS NOT NULL AND (
    LOWER(description) LIKE '%bill%' OR 
    LOWER(description) LIKE '%inv-%' OR
    LOWER(description) LIKE '%subcontractor%' OR 
    LOWER(description) LIKE '%contractor%'
  ) THEN 'subcontractor_bill'::partner_invoice_line_item_source_type
  -- Check description patterns for employee time
  WHEN description IS NOT NULL AND (
    LOWER(description) LIKE '%time%' OR 
    LOWER(description) LIKE '%hours%' OR
    LOWER(description) LIKE '%labor%' OR 
    LOWER(description) LIKE '%employee%'
  ) THEN 'employee_time'::partner_invoice_line_item_source_type
  -- Default fallback
  ELSE 'other'::partner_invoice_line_item_source_type
END
WHERE source_type IS NULL;