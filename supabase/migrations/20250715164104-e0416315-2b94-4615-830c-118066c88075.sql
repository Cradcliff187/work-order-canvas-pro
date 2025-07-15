-- Fix sync_auth_user_metadata function to write to app_metadata instead of user_metadata
-- This prevents users from potentially modifying their own authorization levels

-- Drop the old function
DROP FUNCTION IF EXISTS public.sync_auth_user_metadata();

-- Create the updated function that writes to app_metadata
CREATE OR REPLACE FUNCTION public.sync_auth_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update auth.users app_metadata with user_type from profiles
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('user_type', NEW.user_type)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Migrate existing user_metadata to app_metadata for all users
-- This ensures all users have their user_type stored securely in app_metadata
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('user_type', 
    COALESCE(
      (raw_user_meta_data->>'user_type'),
      (SELECT p.user_type::text FROM public.profiles p WHERE p.user_id = auth.users.id),
      'subcontractor'
    )
  )
WHERE raw_app_meta_data->>'user_type' IS NULL;