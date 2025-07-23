-- Check existing triggers on auth.users
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_schema = 'auth' 
    AND t.event_object_table = 'users';

-- Create the missing trigger for automatic profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Also check if call_send_email_trigger function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'call_send_email_trigger';