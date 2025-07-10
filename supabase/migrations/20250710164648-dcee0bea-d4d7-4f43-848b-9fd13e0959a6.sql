-- Update user cradcliff@austinkunzconstruction.com to admin user type
UPDATE public.profiles 
SET user_type = 'admin' 
WHERE email = 'cradcliff@austinkunzconstruction.com';