-- Create receipt_line_items table for storing individual extracted items
CREATE TABLE receipt_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC NOT NULL,
  line_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to receipts table
ALTER TABLE receipts 
ADD COLUMN subtotal NUMERIC,
ADD COLUMN tax_amount NUMERIC,
ADD COLUMN ocr_confidence NUMERIC CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
ADD COLUMN line_items_extracted BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX idx_receipt_line_items_receipt_id ON receipt_line_items(receipt_id);
CREATE INDEX idx_receipt_line_items_line_number ON receipt_line_items(receipt_id, line_number);

-- Enable RLS on receipt_line_items
ALTER TABLE receipt_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for receipt_line_items
CREATE POLICY "admins_can_manage_receipt_line_items" 
ON receipt_line_items FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "employees_can_manage_own_receipt_line_items" 
ON receipt_line_items FOR ALL 
USING (
  receipt_id IN (
    SELECT id FROM receipts WHERE employee_user_id = auth_profile_id()
  )
)
WITH CHECK (
  receipt_id IN (
    SELECT id FROM receipts WHERE employee_user_id = auth_profile_id()
  )
);

-- Create function to update receipt line items updated_at
CREATE OR REPLACE FUNCTION update_receipt_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_receipt_line_items_updated_at_trigger
  BEFORE UPDATE ON receipt_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_receipt_line_items_updated_at();