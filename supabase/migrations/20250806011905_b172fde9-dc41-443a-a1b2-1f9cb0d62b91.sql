-- Create helper function to determine uploader organization type
CREATE OR REPLACE FUNCTION public.get_uploader_organization_type(uploader_profile_id uuid)
RETURNS organization_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_type organization_type;
BEGIN
  -- Get the organization type for the uploader
  SELECT o.organization_type INTO org_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = uploader_profile_id
  AND o.is_active = true
  LIMIT 1;
  
  RETURN org_type;
END;
$$;

-- Drop existing work_order_attachments RLS policies
DROP POLICY IF EXISTS "Internal org manage attachments" ON work_order_attachments;
DROP POLICY IF EXISTS "Partners can upload public attachments to their work orders" ON work_order_attachments;
DROP POLICY IF EXISTS "Partners view public attachments for their work orders" ON work_order_attachments;
DROP POLICY IF EXISTS "Subcontractors can delete own work order attachments" ON work_order_attachments;
DROP POLICY IF EXISTS "Subcontractors can insert work order attachments" ON work_order_attachments;
DROP POLICY IF EXISTS "Subcontractors can update own work order attachments" ON work_order_attachments;
DROP POLICY IF EXISTS "Subcontractors can view work order attachments" ON work_order_attachments;

-- Create new organization-based visibility RLS policies for work_order_attachments

-- Policy 1: Admins can see and manage everything
CREATE POLICY "Admins full access to all attachments"
ON work_order_attachments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- Policy 2: Partners can see partner uploads + public admin uploads for their work orders
CREATE POLICY "Partners view partner and public admin attachments"
ON work_order_attachments
FOR SELECT
USING (
  -- Must be a partner user
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  -- Must be for their work order
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  (
    -- Always show partner uploads (regardless of is_internal flag)
    get_uploader_organization_type(uploaded_by_user_id) = 'partner'
    OR
    -- Show public admin uploads (is_internal = false)
    (get_uploader_organization_type(uploaded_by_user_id) = 'internal' AND is_internal = false)
  )
);

-- Policy 3: Partners can upload attachments to their work orders (always public)
CREATE POLICY "Partners upload to their work orders"
ON work_order_attachments
FOR INSERT
WITH CHECK (
  -- Must be a partner user
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  -- Must be for their work order
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  -- Partner uploads are always public
  is_internal = false
);

-- Policy 4: Subcontractors can see partner uploads + their org uploads + admin uploads (both public and internal if assigned)
CREATE POLICY "Subcontractors view relevant attachments"
ON work_order_attachments
FOR SELECT
USING (
  -- Must be a subcontractor user
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
  AND
  -- Must be for work orders they're assigned to
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
    )
  )
  AND
  (
    -- Always show partner uploads
    get_uploader_organization_type(uploaded_by_user_id) = 'partner'
    OR
    -- Show uploads from their own subcontractor organization
    uploaded_by_user_id IN (
      SELECT om.user_id FROM organization_members om
      WHERE om.organization_id IN (
        SELECT scom.organization_id FROM organization_members scom
        JOIN organizations sco ON sco.id = scom.organization_id
        WHERE scom.user_id = auth_profile_id_safe()
        AND sco.organization_type = 'subcontractor'
      )
    )
    OR
    -- Show all admin uploads (both public and internal) for assigned work orders
    get_uploader_organization_type(uploaded_by_user_id) = 'internal'
  )
);

-- Policy 5: Subcontractors can upload attachments to assigned work orders
CREATE POLICY "Subcontractors upload to assigned work orders"
ON work_order_attachments
FOR INSERT
WITH CHECK (
  -- Must be a subcontractor user
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
  AND
  -- Must be for work orders they're assigned to
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
    )
  )
  AND
  -- Uploader must be the current user
  uploaded_by_user_id = auth_profile_id_safe()
);

-- Policy 6: Subcontractors can manage their own attachments
CREATE POLICY "Subcontractors manage own attachments"
ON work_order_attachments
FOR UPDATE
USING (uploaded_by_user_id = auth_profile_id_safe())
WITH CHECK (uploaded_by_user_id = auth_profile_id_safe());

CREATE POLICY "Subcontractors delete own attachments"
ON work_order_attachments
FOR DELETE
USING (uploaded_by_user_id = auth_profile_id_safe());