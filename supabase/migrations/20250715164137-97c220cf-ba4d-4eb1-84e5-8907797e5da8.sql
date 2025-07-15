-- Fix sync_auth_user_metadata function to write to app_metadata instead of user_metadata
-- This prevents users from potentially modifying their own authorization levels

-- Step 1: Drop the trigger that depends on the function
DROP TRIGGER IF EXISTS sync_user_type_to_auth ON public.profiles;

-- Step 2: Drop and recreate the function with app_metadata support
DROP FUNCTION IF EXISTS public.sync_auth_user_metadata();

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

-- Step 3: Recreate the trigger
CREATE TRIGGER sync_user_type_to_auth
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.user_type IS DISTINCT FROM NEW.user_type)
  EXECUTE FUNCTION public.sync_auth_user_metadata();

-- Step 4: Migrate existing user_metadata to app_metadata for all users
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