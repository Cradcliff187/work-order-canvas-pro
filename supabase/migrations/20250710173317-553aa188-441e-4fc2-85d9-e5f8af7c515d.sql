-- Create storage bucket for work order photos
INSERT INTO storage.buckets (id, name, public) VALUES ('work-order-photos', 'work-order-photos', true);

-- Create policies for work order photo uploads
CREATE POLICY "Subcontractors can upload photos for their reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'work-order-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
);

CREATE POLICY "Users can view work order photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'work-order-photos'
  AND (
    -- Subcontractors can view their own photos
    (get_current_user_type() = 'subcontractor' AND auth.uid()::text = (storage.foldername(name))[1])
    -- Admins can view all photos
    OR get_current_user_type() = 'admin'
    -- Partners can view photos for their organization's work orders
    OR (get_current_user_type() = 'partner' AND EXISTS (
      SELECT 1 FROM work_order_attachments woa
      JOIN work_orders wo ON wo.id = woa.work_order_id
      WHERE woa.file_url LIKE '%' || name || '%'
      AND user_belongs_to_organization(wo.organization_id)
    ))
  )
);

CREATE POLICY "Subcontractors can update their own photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'work-order-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
);

CREATE POLICY "Subcontractors can delete their own photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'work-order-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND get_current_user_type() = 'subcontractor'
);