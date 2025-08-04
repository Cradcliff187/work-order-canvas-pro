-- Create secure Storage RLS policies for subcontractors on work-order-attachments bucket

-- INSERT Policy: Allow subcontractors to upload files to assigned work orders
CREATE POLICY "Subcontractors can upload to assigned work orders"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND auth.uid() IS NOT NULL
  AND (string_to_array(name, '/'))[1] = 'work-orders'  -- Path validation
  AND (string_to_array(name, '/'))[2]::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.assigned_organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
);

-- SELECT Policy: Allow subcontractors to view files from assigned work orders
CREATE POLICY "Subcontractors can view files from assigned work orders"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid() IS NOT NULL
  AND (string_to_array(name, '/'))[1] = 'work-orders'  -- Path validation
  AND (string_to_array(name, '/'))[2]::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.assigned_organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
);

-- DELETE Policy: Allow subcontractors to delete only their own uploads
CREATE POLICY "Subcontractors can delete own uploads from assigned work orders"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid() IS NOT NULL
  AND (string_to_array(name, '/'))[1] = 'work-orders'  -- Path validation
  AND owner = auth.uid()  -- Ownership check - only own uploads
  AND (string_to_array(name, '/'))[2]::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.assigned_organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
);

-- UPDATE Policy: Allow subcontractors to update metadata of their own files
CREATE POLICY "Subcontractors can update own file metadata from assigned work orders"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'work-order-attachments' 
  AND auth.uid() IS NOT NULL
  AND (string_to_array(name, '/'))[1] = 'work-orders'  -- Path validation
  AND owner = auth.uid()  -- Ownership check - only own uploads
  AND (string_to_array(name, '/'))[2]::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.assigned_organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
)
WITH CHECK (
  bucket_id = 'work-order-attachments' 
  AND auth.uid() IS NOT NULL
  AND (string_to_array(name, '/'))[1] = 'work-orders'  -- Path validation
  AND owner = auth.uid()  -- Ownership check - only own uploads
  AND (string_to_array(name, '/'))[2]::uuid IN (
    SELECT wo.id 
    FROM work_orders wo
    JOIN organization_members om ON wo.assigned_organization_id = om.organization_id
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
);