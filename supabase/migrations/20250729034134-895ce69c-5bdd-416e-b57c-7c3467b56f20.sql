-- Phase 3 Recovery: Emergency Stabilization - Fixed
-- First create the missing enum type
CREATE TYPE user_type AS ENUM ('admin', 'partner', 'subcontractor', 'employee');

-- Add back missing columns to profiles table temporarily
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type user_type DEFAULT 'subcontractor',
ADD COLUMN IF NOT EXISTS company_name text;

-- Create missing database functions for compatibility

-- Function to get unread message counts
CREATE OR REPLACE FUNCTION public.get_unread_message_counts()
RETURNS TABLE(work_order_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wom.work_order_id,
    COUNT(*) as unread_count
  FROM work_order_messages wom
  LEFT JOIN message_read_receipts mrr ON mrr.message_id = wom.id AND mrr.user_id = auth_profile_id()
  WHERE mrr.message_id IS NULL
  GROUP BY wom.work_order_id;
END;
$$;

-- Function to get current user type
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS user_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_type user_type;
BEGIN
  SELECT user_type INTO current_user_type
  FROM profiles
  WHERE id = auth_profile_id();
  
  RETURN COALESCE(current_user_type, 'subcontractor'::user_type);
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth_profile_id() 
    AND user_type = 'admin'
  );
END;
$$;

-- Function to get auth profile ID (compatibility)
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT id INTO profile_id
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN profile_id;
END;
$$;

-- Update user_type values based on organization memberships where possible
UPDATE profiles SET user_type = 'admin'
WHERE id IN (
  SELECT om.user_id 
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE o.organization_type = 'internal' AND om.role = 'admin'
);

UPDATE profiles SET user_type = 'employee'
WHERE id IN (
  SELECT om.user_id 
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE o.organization_type = 'internal' AND om.role = 'employee'
) AND user_type != 'admin';

UPDATE profiles SET user_type = 'partner'
WHERE id IN (
  SELECT om.user_id 
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE o.organization_type = 'partner'
) AND user_type NOT IN ('admin', 'employee');

UPDATE profiles SET user_type = 'subcontractor'
WHERE id IN (
  SELECT om.user_id 
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE o.organization_type = 'subcontractor'
) AND user_type NOT IN ('admin', 'employee', 'partner');