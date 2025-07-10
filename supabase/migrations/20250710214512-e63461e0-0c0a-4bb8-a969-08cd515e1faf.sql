-- Create or update storage bucket for work order attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-order-attachments', 'work-order-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Update storage policies for the work-order-attachments bucket
DROP POLICY IF EXISTS "Subcontractors can upload files for their reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can view work order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Subcontractors can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Subcontractors can delete their own files" ON storage.objects;

-- Create policies for work order attachment uploads
CREATE POLICY "Subcontractors can upload attachments for their reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
);

CREATE POLICY "Users can view work order attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'work-order-attachments'
  AND (
    -- Subcontractors can view their own attachments
    (get_current_user_type() = 'subcontractor' AND auth.uid()::text = (storage.foldername(name))[1])
    -- Admins can view all attachments
    OR get_current_user_type() = 'admin'
    -- Partners can view attachments for their organization's work orders
    OR (get_current_user_type() = 'partner' AND EXISTS (
      SELECT 1 FROM work_order_attachments woa
      JOIN work_orders wo ON wo.id = woa.work_order_id
      WHERE woa.file_url LIKE '%' || name || '%'
      AND user_belongs_to_organization(wo.organization_id)
    ))
  )
);

CREATE POLICY "Subcontractors can update their own attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
);

CREATE POLICY "Subcontractors can delete their own attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
);