-- Enable RLS on receipt_ocr_cache table
ALTER TABLE public.receipt_ocr_cache ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policy for receipt_ocr_cache
CREATE POLICY "All users can manage receipt_ocr_cache" ON public.receipt_ocr_cache
FOR ALL USING (true) WITH CHECK (true);