-- Add storage policies for partner file operations
-- This fixes the 403 Unauthorized error when partners try to upload files

-- Policy 1: Allow partners to upload files to work orders they own
CREATE POLICY "Partners can upload to owned work orders" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND (string_to_array(name, '/'))[1] = 'work-orders'
  AND ((string_to_array(name, '/'))[2])::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id  
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe() 
    AND o.organization_type = 'partner'
  )
);

-- Policy 2: Allow partners to view files from work orders they own
CREATE POLICY "Partners can view files from owned work orders"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'work-order-attachments'
  AND (string_to_array(name, '/'))[1] = 'work-orders'
  AND ((string_to_array(name, '/'))[2])::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
);

-- Policy 3: Allow partners to update files they uploaded to their work orders
CREATE POLICY "Partners can update files in owned work orders"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-order-attachments'
  AND (string_to_array(name, '/'))[1] = 'work-orders'
  AND ((string_to_array(name, '/'))[2])::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
);

-- Policy 4: Allow partners to delete files they uploaded to their work orders  
CREATE POLICY "Partners can delete files from owned work orders"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-order-attachments'
  AND (string_to_array(name, '/'))[1] = 'work-orders'
  AND ((string_to_array(name, '/'))[2])::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
);