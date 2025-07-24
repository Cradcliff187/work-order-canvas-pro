-- Fix: Create the missing auth user trigger that's causing user creation failures
-- This trigger calls handle_new_user_bulletproof() when a new user is created in auth.users

-- First, clean up any existing conflicting triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_bulletproof ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_robust ON auth.users;

-- Create the essential trigger that calls the bulletproof user setup function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Verify the trigger was created successfully
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Also verify the function exists and has the right permissions
SELECT 
  proname,
  prosecdef,
  proowner
FROM pg_proc 
WHERE proname = 'handle_new_user_bulletproof';