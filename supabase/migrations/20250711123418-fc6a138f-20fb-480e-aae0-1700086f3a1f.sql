-- Allow employees (including admin employees) to upload attachments for time reports
CREATE POLICY "Employees can upload attachments for their time reports" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND (auth.uid())::text = (storage.foldername(name))[1] 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_employee = true
  )
);