-- Check current storage policies for work-order-attachments bucket
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('work-order-attachments', 'work-order-attachments', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];

-- Drop existing restrictive storage policies
DROP POLICY IF EXISTS "Subcontractors can upload their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Employees can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload attachments" ON storage.objects;

-- Create comprehensive storage policies that allow admins to upload on behalf of subcontractors
CREATE POLICY "Admin and Employee file upload access"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND (
    -- Allow admins and employees to upload anywhere in the bucket
    (
      SELECT user_type 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    ) IN ('admin', 'employee')
    OR
    -- Allow subcontractors to upload to their own folder (user_id folder structure)
    (
      (SELECT user_type FROM profiles WHERE user_id = auth.uid()) = 'subcontractor'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

CREATE POLICY "Admin and Employee file select access"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'work-order-attachments'
  AND (
    -- Admins and employees can view all files
    (
      SELECT user_type 
      FROM profiles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    ) IN ('admin', 'employee')
    OR
    -- Subcontractors can view their own files
    (
      (SELECT user_type FROM profiles WHERE user_id = auth.uid()) = 'subcontractor'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    OR
    -- Partners can view files for their organization's work orders
    (
      (SELECT user_type FROM profiles WHERE user_id = auth.uid()) = 'partner'
      AND EXISTS (
        SELECT 1 FROM work_order_attachments woa
        JOIN work_orders wo ON (woa.work_order_id = wo.id OR woa.work_order_report_id IN (
          SELECT wor.id FROM work_order_reports wor WHERE wor.work_order_id = wo.id
        ))
        WHERE woa.file_url = name
        AND wo.organization_id IN (
          SELECT uo.organization_id 
          FROM user_organizations uo
          JOIN profiles p ON p.id = uo.user_id
          WHERE p.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Admin and Employee file update access"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'work-order-attachments'
  AND (
    SELECT user_type 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) IN ('admin', 'employee')
)
WITH CHECK (
  bucket_id = 'work-order-attachments'
  AND (
    SELECT user_type 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) IN ('admin', 'employee')
);

CREATE POLICY "Admin and Employee file delete access"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'work-order-attachments'
  AND (
    SELECT user_type 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) IN ('admin', 'employee')
);