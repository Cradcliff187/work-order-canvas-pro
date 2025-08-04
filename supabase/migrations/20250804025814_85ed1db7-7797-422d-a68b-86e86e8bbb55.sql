-- Fix Storage RLS Policies for Work Order Attachments
-- Phase 2: Enable relationship-based access with proper organization separation

-- Drop all existing storage policies for work-order-attachments bucket
DROP POLICY IF EXISTS "Allow public read access to work-order-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert work-order-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update work-order-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete work-order-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload work order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view work order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete work order attachments" ON storage.objects;
DROP POLICY IF EXISTS "work_order_attachments_policy" ON storage.objects;

-- Helper function to extract work_order_id from file path
CREATE OR REPLACE FUNCTION storage.get_work_order_id_from_path(file_path text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  path_parts text[];
  work_order_id_text text;
BEGIN
  -- Handle new path structure: work-orders/{work_order_id}/{filename}
  IF file_path LIKE 'work-orders/%' THEN
    path_parts := string_to_array(file_path, '/');
    IF array_length(path_parts, 1) >= 2 THEN
      work_order_id_text := path_parts[2];
      -- Validate UUID format
      IF work_order_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN work_order_id_text::uuid;
      END IF;
    END IF;
  END IF;
  
  -- Handle legacy path structure: {user_id}/{work_order_id}/{filename}
  path_parts := string_to_array(file_path, '/');
  IF array_length(path_parts, 1) >= 2 THEN
    work_order_id_text := path_parts[2];
    -- Validate UUID format
    IF work_order_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN work_order_id_text::uuid;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Helper function to extract user_id from legacy file paths
CREATE OR REPLACE FUNCTION storage.get_user_id_from_legacy_path(file_path text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  path_parts text[];
  user_id_text text;
BEGIN
  -- Only for legacy paths (not starting with work-orders/)
  IF file_path LIKE 'work-orders/%' THEN
    RETURN NULL;
  END IF;
  
  path_parts := string_to_array(file_path, '/');
  IF array_length(path_parts, 1) >= 1 THEN
    user_id_text := path_parts[1];
    -- Validate UUID format
    IF user_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN user_id_text::uuid;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create new relationship-based RLS policies for work-order-attachments bucket

-- 1. Admin/Employee Full Access
CREATE POLICY "admin_employee_full_access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'work-order-attachments' 
    AND EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'internal'
      AND om.role IN ('admin', 'manager', 'employee')
    )
  )
  WITH CHECK (
    bucket_id = 'work-order-attachments' 
    AND EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'internal'
      AND om.role IN ('admin', 'manager', 'employee')
    )
  );

-- 2. Partner Organization Access (for their work orders)
CREATE POLICY "partner_work_order_access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'work-order-attachments' 
    AND (
      -- New path structure: work-orders/{work_order_id}/
      (storage.get_work_order_id_from_path(name) IS NOT NULL
       AND EXISTS (
         SELECT 1 
         FROM work_orders wo
         JOIN organization_members om ON om.organization_id = wo.organization_id
         JOIN organizations o ON o.id = om.organization_id
         WHERE wo.id = storage.get_work_order_id_from_path(name)
         AND om.user_id = auth_profile_id_safe()
         AND o.organization_type = 'partner'
       ))
      OR
      -- Legacy path structure: own uploads only
      (storage.get_user_id_from_legacy_path(name) IS NOT NULL
       AND storage.get_user_id_from_legacy_path(name) IN (
         SELECT user_id FROM profiles WHERE id = auth_profile_id_safe()
       ))
    )
  )
  WITH CHECK (
    bucket_id = 'work-order-attachments' 
    AND (
      -- New path structure: work-orders/{work_order_id}/
      (storage.get_work_order_id_from_path(name) IS NOT NULL
       AND EXISTS (
         SELECT 1 
         FROM work_orders wo
         JOIN organization_members om ON om.organization_id = wo.organization_id
         JOIN organizations o ON o.id = om.organization_id
         WHERE wo.id = storage.get_work_order_id_from_path(name)
         AND om.user_id = auth_profile_id_safe()
         AND o.organization_type = 'partner'
       ))
      OR
      -- Legacy path structure: own uploads only
      (storage.get_user_id_from_legacy_path(name) IS NOT NULL
       AND storage.get_user_id_from_legacy_path(name) IN (
         SELECT user_id FROM profiles WHERE id = auth_profile_id_safe()
       ))
    )
  );

-- 3. Subcontractor Organization Access (for assigned work orders)
CREATE POLICY "subcontractor_assigned_work_order_access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'work-order-attachments' 
    AND (
      -- New path structure: work-orders/{work_order_id}/
      (storage.get_work_order_id_from_path(name) IS NOT NULL
       AND EXISTS (
         SELECT 1 
         FROM work_orders wo
         JOIN organization_members om ON om.organization_id = wo.assigned_organization_id
         JOIN organizations o ON o.id = om.organization_id
         WHERE wo.id = storage.get_work_order_id_from_path(name)
         AND om.user_id = auth_profile_id_safe()
         AND o.organization_type = 'subcontractor'
       ))
      OR
      -- Legacy path structure: own uploads only
      (storage.get_user_id_from_legacy_path(name) IS NOT NULL
       AND storage.get_user_id_from_legacy_path(name) IN (
         SELECT user_id FROM profiles WHERE id = auth_profile_id_safe()
       ))
    )
  )
  WITH CHECK (
    bucket_id = 'work-order-attachments' 
    AND (
      -- New path structure: work-orders/{work_order_id}/
      (storage.get_work_order_id_from_path(name) IS NOT NULL
       AND EXISTS (
         SELECT 1 
         FROM work_orders wo
         JOIN organization_members om ON om.organization_id = wo.assigned_organization_id
         JOIN organizations o ON o.id = om.organization_id
         WHERE wo.id = storage.get_work_order_id_from_path(name)
         AND om.user_id = auth_profile_id_safe()
         AND o.organization_type = 'subcontractor'
       ))
      OR
      -- Legacy path structure: own uploads only
      (storage.get_user_id_from_legacy_path(name) IS NOT NULL
       AND storage.get_user_id_from_legacy_path(name) IN (
         SELECT user_id FROM profiles WHERE id = auth_profile_id_safe()
       ))
    )
  );

-- Keep existing avatar bucket policies (they work correctly)
-- Avatar policies are not modified since they work as expected