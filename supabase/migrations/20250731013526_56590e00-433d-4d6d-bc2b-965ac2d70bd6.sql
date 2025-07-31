-- Phase 4: Database Legacy Cleanup
-- Remove legacy user_type functions and enum

-- Drop legacy functions
DROP FUNCTION IF EXISTS public.get_current_user_type();
DROP FUNCTION IF EXISTS public.get_jwt_user_type();

-- Remove user_type column from profiles table if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;

-- Drop the user_type enum
DROP TYPE IF EXISTS public.user_type;