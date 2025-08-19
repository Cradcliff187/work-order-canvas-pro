-- Add PDF storage columns to work_order_reports table
ALTER TABLE public.work_order_reports 
ADD COLUMN pdf_url TEXT,
ADD COLUMN pdf_generated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.work_order_reports.pdf_url IS 'URL to the generated PDF report stored in Supabase Storage';
COMMENT ON COLUMN public.work_order_reports.pdf_generated_at IS 'Timestamp when the PDF report was generated';