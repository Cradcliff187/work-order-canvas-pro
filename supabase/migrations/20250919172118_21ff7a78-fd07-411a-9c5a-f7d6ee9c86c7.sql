-- Add work_order_id column to partner_invoice_line_items for direct work order reference
ALTER TABLE partner_invoice_line_items 
ADD COLUMN work_order_id UUID REFERENCES work_orders(id);

-- Create index for performance
CREATE INDEX idx_partner_invoice_line_items_work_order_id ON partner_invoice_line_items(work_order_id);

-- Create function to get consistent work order reference
CREATE OR REPLACE FUNCTION get_work_order_reference(p_work_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  work_order_number TEXT;
BEGIN
  -- Handle null input
  IF p_work_order_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get work order number
  SELECT wo.work_order_number INTO work_order_number
  FROM work_orders wo
  WHERE wo.id = p_work_order_id;
  
  -- Return work order number if it exists and is not empty
  IF work_order_number IS NOT NULL AND work_order_number != '' THEN
    RETURN work_order_number;
  END IF;
  
  -- Fallback to formatted work order ID
  RETURN 'WO-' || LEFT(p_work_order_id::TEXT, 8);
END;
$$;

-- Create function to populate work_order_id from work_order_report_id
CREATE OR REPLACE FUNCTION populate_line_item_work_order_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If work_order_id is not set but work_order_report_id is set, populate it
  IF NEW.work_order_id IS NULL AND NEW.work_order_report_id IS NOT NULL THEN
    SELECT wor.work_order_id INTO NEW.work_order_id
    FROM work_order_reports wor
    WHERE wor.id = NEW.work_order_report_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-populate work_order_id
CREATE TRIGGER trigger_populate_line_item_work_order_id
  BEFORE INSERT OR UPDATE ON partner_invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION populate_line_item_work_order_id();

-- Update existing records to populate work_order_id from work_order_reports
UPDATE partner_invoice_line_items pili
SET work_order_id = wor.work_order_id
FROM work_order_reports wor
WHERE pili.work_order_report_id = wor.id 
AND pili.work_order_id IS NULL;

-- Create view for partner invoice line items with work order reference
CREATE OR REPLACE VIEW partner_invoice_line_items_with_reference AS
SELECT 
  pili.*,
  get_work_order_reference(pili.work_order_id) as work_order_reference,
  wo.work_order_number,
  wo.title as work_order_title
FROM partner_invoice_line_items pili
LEFT JOIN work_orders wo ON wo.id = pili.work_order_id;

-- Create view for subcontractor bill work orders with reference
CREATE OR REPLACE VIEW subcontractor_bill_work_orders_with_reference AS
SELECT 
  sbwo.*,
  get_work_order_reference(sbwo.work_order_id) as work_order_reference,
  wo.work_order_number,
  wo.title as work_order_title
FROM subcontractor_bill_work_orders sbwo
LEFT JOIN work_orders wo ON wo.id = sbwo.work_order_id;