-- Add storage policies for partners and employees to upload/view work order attachments
-- Partners can upload attachments when creating work orders
-- Employees can view all work order attachments

-- Allow partners to upload work order attachments to their own folder
CREATE POLICY "Partners can upload work order attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-attachments' AND
  get_current_user_type() = 'partner' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow employees to view all work order attachments
CREATE POLICY "Employees can view all work order attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-order-attachments' AND
  get_current_user_type() = 'employee'
);

-- Allow employees to upload work order attachments to their own folder
CREATE POLICY "Employees can upload work order attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-attachments' AND
  get_current_user_type() = 'employee' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow employees to update their own work order attachments
CREATE POLICY "Employees can update own work order attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-order-attachments' AND
  get_current_user_type() = 'employee' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow employees to delete their own work order attachments
CREATE POLICY "Employees can delete own work order attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-order-attachments' AND
  get_current_user_type() = 'employee' AND
  auth.uid()::text = (storage.foldername(name))[1]
);