-- Remove attempt to create triggers on auth.users (not allowed by Supabase)
-- Edge function now handles profile creation directly

-- Clean up any existing conflicting triggers that might have been created elsewhere
DROP TRIGGER IF EXISTS on_auth_user_created_bulletproof ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created_robust ON public.profiles;

-- Note: Triggers on auth.users are not allowed in Supabase for security reasons
-- The create-admin-user edge function now handles profile creation directly