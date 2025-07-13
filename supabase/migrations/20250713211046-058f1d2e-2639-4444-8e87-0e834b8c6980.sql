-- Remove trigger-based welcome email system
-- Welcome emails are now sent directly from user creation processes
-- This eliminates duplicate emails and security concerns around password handling

-- Drop the trigger that fires on profile creation
DROP TRIGGER IF EXISTS trigger_user_welcome_email ON profiles;

-- Drop the function that sends welcome emails via trigger
DROP FUNCTION IF EXISTS public.notify_user_welcome();

-- Note: Welcome emails are sent directly from:
-- 1. create-admin-user edge function (includes temporary password)
-- 2. Any other user creation processes should call email-welcome directly
-- This approach provides better security and eliminates duplicate email issues