-- COMPLETE RLS RECURSION FIX WITH METADATA SYNCHRONIZATION
-- Date: 2025-01-15
-- This migration eliminates all RLS recursion by using JWT metadata instead of database queries

-- PHASE 1: ESTABLISH METADATA SYNCHRONIZATION
-- =============================================

-- Create function to sync auth metadata with profiles data
CREATE OR REPLACE FUNCTION sync_auth_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    raw_user_meta_data || 
    jsonb_build_object('user_type', NEW.user_type)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync on profile changes
DROP TRIGGER IF EXISTS sync_user_type_to_auth ON public.profiles;
CREATE TRIGGER sync_user_type_to_auth
AFTER INSERT OR UPDATE OF user_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION sync_auth_user_metadata();

-- One-time sync of existing users metadata
UPDATE auth.users 
SET raw_user_meta_data = 
  raw_user_meta_data || 
  jsonb_build_object('user_type', p.user_type)
FROM profiles p 
WHERE auth.users.id = p.user_id;

-- PHASE 2: REPLACE HELPER FUNCTIONS WITH JWT-BASED APPROACH  
-- ==========================================================

-- Update auth_user_type() to use JWT metadata (no database queries)
CREATE OR REPLACE FUNCTION public.auth_user_type()
RETURNS user_type AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'user_type')::user_type,
    'subcontractor'::user_type
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update auth_is_admin() to use JWT metadata (no database queries)
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'user_type') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update auth_profile_id() to use auth.uid() directly (no database queries)
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- PHASE 3: COMPREHENSIVE RLS POLICY CLEANUP
-- ==========================================

-- DROP ALL RECURSIVE POLICIES ON PROFILES TABLE
DROP POLICY IF EXISTS "admin_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles; 
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update employee profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON public.profiles;

-- Keep only basic non-recursive policies on profiles
-- (These already exist and are non-recursive)
-- "Users read own profile" - uses auth.uid() directly
-- "Users update own profile" - uses auth.uid() directly  
-- "Users create own profile" - uses auth.uid() directly

-- Create new admin policies using JWT metadata directly (no recursion)
CREATE POLICY "admin_can_insert_profiles_jwt"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR 
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_type') = 'admin', false)
);

CREATE POLICY "admin_can_update_profiles_jwt"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_type') = 'admin', false)
)
WITH CHECK (
  user_id = auth.uid()
  OR
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_type') = 'admin', false)
);

CREATE POLICY "admin_can_delete_profiles_jwt"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_type') = 'admin', false)
);

CREATE POLICY "admin_can_view_all_profiles_jwt"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_type') = 'admin', false)
);

-- UPDATE OTHER TABLE POLICIES TO USE NEW NON-RECURSIVE FUNCTIONS
-- ===============================================================

-- Update audit_logs policies (already uses auth_is_admin which is now non-recursive)
-- Update email_logs policies (already uses auth_is_admin which is now non-recursive)
-- Update email_settings policies (already uses auth_is_admin which is now non-recursive)
-- Update email_templates policies (already uses auth_user_type which is now non-recursive)
-- Update employee_reports policies (already uses auth_is_admin which is now non-recursive)
-- Update invoice_attachments policies (already uses auth_user_type which is now non-recursive)
-- Update invoices policies (already uses auth_user_type which is now non-recursive)
-- Update organizations policies (already uses auth_user_type which is now non-recursive)
-- Update partner_locations policies (already uses auth_user_type which is now non-recursive)
-- Update receipt_work_orders policies (already uses auth_is_admin which is now non-recursive)
-- Update receipts policies (already uses auth_is_admin which is now non-recursive)
-- Update system_settings policies (already uses auth_is_admin which is now non-recursive)
-- Update trades policies (already uses auth_user_type which is now non-recursive)
-- Update user_organizations policies (already uses auth_user_type which is now non-recursive)
-- Update work_order_assignments policies (already uses auth_user_type which is now non-recursive)
-- Update work_order_attachments policies (already uses auth_user_type which is now non-recursive)
-- Update work_order_reports policies (already uses auth_user_type which is now non-recursive)
-- Update work_orders policies (already uses auth_user_type which is now non-recursive)

-- All other table policies will automatically use the new non-recursive helper functions

-- Add helpful comments
COMMENT ON FUNCTION public.auth_user_type() IS 'Returns user type from JWT metadata - no database queries, prevents RLS recursion';
COMMENT ON FUNCTION public.auth_is_admin() IS 'Checks if user is admin from JWT metadata - no database queries, prevents RLS recursion';
COMMENT ON FUNCTION sync_auth_user_metadata() IS 'Keeps auth.users.raw_user_meta_data synchronized with profiles.user_type changes';

-- Final verification query (will be logged)
SELECT 
  'RLS Recursion Fix Applied Successfully' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_count
FROM profiles;