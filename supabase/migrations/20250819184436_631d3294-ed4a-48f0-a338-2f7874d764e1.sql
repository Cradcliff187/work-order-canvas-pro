-- Add performance index for PDF generation timestamp queries
-- This index will improve performance for:
-- - Querying reports with generated PDFs (WHERE pdf_generated_at IS NOT NULL)  
-- - Sorting by PDF generation date (ORDER BY pdf_generated_at DESC)
-- - Date range queries for PDF analytics
CREATE INDEX IF NOT EXISTS idx_work_order_reports_pdf_generated_at 
ON public.work_order_reports (pdf_generated_at DESC);

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_work_order_reports_pdf_generated_at 
IS 'Performance index for querying and sorting work order reports by PDF generation timestamp. Supports efficient filtering and sorting of reports with generated PDFs.';