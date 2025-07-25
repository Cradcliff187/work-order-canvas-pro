-- EMERGENCY AUTH FIX: Add comprehensive debugging and fallback authentication
-- This addresses the auth.uid() returning null issue

-- 1. Create a debug function to check auth state
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_uid uuid;
  jwt_content jsonb;
  profile_exists boolean;
BEGIN
  -- Get current auth.uid()
  SELECT auth.uid() INTO current_uid;
  
  -- Get JWT content
  SELECT auth.jwt() INTO jwt_content;
  
  -- Check if profile exists for this user
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE user_id = current_uid
  ) INTO profile_exists;
  
  RETURN jsonb_build_object(
    'auth_uid', current_uid,
    'jwt_exists', jwt_content IS NOT NULL,
    'jwt_metadata', COALESCE(jwt_content -> 'app_metadata', '{}'::jsonb),
    'profile_exists', profile_exists,
    'timestamp', now()
  );
END;
$$;

-- 2. Create enhanced JWT functions with better error handling
CREATE OR REPLACE FUNCTION public.jwt_profile_id_safe()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current auth user ID
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE WARNING 'auth.uid() returned null in jwt_profile_id_safe()';
    RETURN NULL;
  END IF;
  
  -- First try to get from JWT app_metadata
  SELECT (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid INTO profile_id;
  
  -- If not in JWT, query profiles table directly (bypassing RLS)
  IF profile_id IS NULL THEN
    SELECT id INTO profile_id
    FROM profiles
    WHERE user_id = current_user_id
    LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$$;

-- 3. Create a function to force sync JWT metadata for current user
CREATE OR REPLACE FUNCTION public.force_jwt_sync_for_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  result jsonb;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No authenticated user found'
    );
  END IF;
  
  -- Call the existing JWT sync function
  SELECT trigger_jwt_metadata_sync(current_user_id) INTO result;
  
  RETURN result;
END;
$$;

-- 4. Update work_order_reports RLS policies with better error handling
DROP POLICY IF EXISTS "subcontractors_can_insert_work_order_reports" ON work_order_reports;

CREATE POLICY "subcontractors_can_insert_work_order_reports"
ON work_order_reports
FOR INSERT
TO public
WITH CHECK (
  -- Direct auth.uid() check first
  auth.uid() IS NOT NULL
  AND (
    -- Method 1: Use JWT functions if available
    (jwt_user_type() = 'subcontractor' AND subcontractor_user_id = jwt_profile_id_safe())
    OR
    -- Method 2: Direct profile lookup as fallback
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.user_type = 'subcontractor'
      AND p.id = subcontractor_user_id
      AND p.is_active = true
    ))
  )
  AND work_order_id IN (
    SELECT work_order_id 
    FROM auth_user_organization_assignments()
    WHERE auth.uid() IS NOT NULL
  )
);

-- 5. Update work_order_attachments policy with same approach
DROP POLICY IF EXISTS "subcontractors_can_insert_work_order_attachments" ON work_order_attachments;

CREATE POLICY "subcontractors_can_insert_work_order_attachments"
ON work_order_attachments
FOR INSERT
TO public
WITH CHECK (
  -- Direct auth.uid() check first
  auth.uid() IS NOT NULL
  AND (
    -- Method 1: Use JWT functions if available
    (jwt_user_type() = 'subcontractor' AND uploaded_by_user_id = jwt_profile_id_safe())
    OR
    -- Method 2: Direct profile lookup as fallback
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.user_type = 'subcontractor'
      AND p.id = uploaded_by_user_id
      AND p.is_active = true
    ))
  )
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
      WHERE auth.uid() IS NOT NULL
    ))
    OR
    -- For work order report attachments
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      JOIN profiles p ON p.id = wor.subcontractor_user_id
      WHERE wor.id = work_order_report_id
      AND p.user_id = auth.uid()
      AND p.is_active = true
    ))
  )
);

-- 6. Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.debug_auth_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_profile_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_jwt_sync_for_current_user() TO authenticated;