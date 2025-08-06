-- CRITICAL SECURITY FIX: Update RLS policies for work_order_attachments to properly enforce internal attachment visibility

-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Partners view only non-internal attachments" ON work_order_attachments;
DROP POLICY IF EXISTS "Subcontractors view relevant attachments" ON work_order_attachments;

-- Create new, more secure RLS policies for partners
CREATE POLICY "Partners can only view public attachments for their work orders" 
ON work_order_attachments 
FOR SELECT 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must be a partner organization member
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  -- Work order must belong to their organization
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
  )
  AND
  -- CRITICAL: Must NOT be internal (partners cannot see internal attachments)
  (is_internal IS FALSE OR is_internal IS NULL)
);

-- Create new, more secure RLS policy for subcontractors
CREATE POLICY "Subcontractors can view attachments for assigned work orders" 
ON work_order_attachments 
FOR SELECT 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must be a subcontractor organization member
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'subcontractor'
  )
  AND
  -- Work order must be assigned to their organization
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
    )
  )
  AND
  -- Can see: partner uploads (not internal), their own org uploads, admin uploads
  (
    -- Partner uploads (public only)
    (get_uploader_organization_type(uploaded_by_user_id) = 'partner' AND (is_internal IS FALSE OR is_internal IS NULL))
    OR
    -- Their own organization uploads (including internal between subcontractor members)
    uploaded_by_user_id IN (
      SELECT om.user_id
      FROM organization_members om
      WHERE om.organization_id IN (
        SELECT scom.organization_id
        FROM organization_members scom
        JOIN organizations sco ON sco.id = scom.organization_id
        WHERE scom.user_id = auth_profile_id_safe()
        AND sco.organization_type = 'subcontractor'
      )
    )
    OR
    -- Admin/internal uploads (all visible to subcontractors as they are work instructions)
    get_uploader_organization_type(uploaded_by_user_id) = 'internal'
  )
);

-- Add audit logging for security violations
CREATE OR REPLACE FUNCTION log_attachment_access_violation(
  user_id UUID,
  attachment_id UUID,
  violation_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'work_order_attachments',
    attachment_id,
    'security_violation',
    jsonb_build_object(
      'violation_type', violation_type,
      'timestamp', NOW(),
      'user_profile_id', user_id
    ),
    user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;