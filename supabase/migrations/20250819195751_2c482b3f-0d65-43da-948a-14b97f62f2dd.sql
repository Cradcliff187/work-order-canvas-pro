-- Add missing columns to work_order_reports if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_order_reports' AND column_name = 'pdf_url') THEN
    ALTER TABLE work_order_reports ADD COLUMN pdf_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_order_reports' AND column_name = 'pdf_generated_at') THEN
    ALTER TABLE work_order_reports ADD COLUMN pdf_generated_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_order_reports' AND column_name = 'invoice_amount') THEN
    ALTER TABLE work_order_reports ADD COLUMN invoice_amount DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_order_reports' AND column_name = 'invoice_number') THEN
    ALTER TABLE work_order_reports ADD COLUMN invoice_number TEXT;
  END IF;
END $$;