-- Create storage policies for invoice attachments on work-order-attachments bucket
-- These policies maintain financial privacy by preventing partners from accessing invoice documents

-- Policy 1: Subcontractors can upload invoice attachments
CREATE POLICY "Subcontractors can upload invoice attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
  AND name LIKE '%/invoices/%'
);

-- Policy 2: View invoice attachments (financial privacy enforced)
CREATE POLICY "View invoice attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'work-order-attachments'
  AND name LIKE '%/invoices/%'
  AND (
    -- Subcontractors can view their own invoice attachments
    (get_current_user_type() = 'subcontractor' AND auth.uid()::text = (storage.foldername(name))[1])
    -- Admins can view all invoice attachments
    OR get_current_user_type() = 'admin'
    -- Partners CANNOT view invoice attachments (financial privacy)
  )
);

-- Policy 3: Subcontractors can update their own invoice attachments
CREATE POLICY "Subcontractors can update their own invoice attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
  AND name LIKE '%/invoices/%'
);

-- Policy 4: Subcontractors can delete their own invoice attachments
CREATE POLICY "Subcontractors can delete their own invoice attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
  AND name LIKE '%/invoices/%'
);

-- Add comment for documentation
COMMENT ON POLICY "View invoice attachments" ON storage.objects IS 
'Financial privacy policy: Partners cannot access invoice attachments. Path pattern: /{user_id}/invoices/{invoice_id}/{filename}';