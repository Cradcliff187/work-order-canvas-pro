-- Create the missing auth_user_type function that storage policies expect
CREATE OR REPLACE FUNCTION public.auth_user_type()
RETURNS user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simply call the existing jwt_user_type function
  RETURN public.jwt_user_type();
END;
$$;

-- Update get_current_user_type to call jwt_user_type directly for better performance
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call jwt_user_type directly instead of the non-existent auth_user_type
  RETURN public.jwt_user_type();
END;
$$;