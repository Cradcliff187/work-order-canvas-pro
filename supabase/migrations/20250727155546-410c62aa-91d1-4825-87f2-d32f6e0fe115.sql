-- Phase 1: Database Cleanup - Remove welcome_email remnants

-- Drop the orphaned trigger function
DROP FUNCTION IF EXISTS public.trigger_welcome_email() CASCADE;

-- Clean up any welcome_email records from email_queue
DELETE FROM public.email_queue 
WHERE template_name = 'welcome_email';

-- Clean up any welcome_email records from email_logs
DELETE FROM public.email_logs 
WHERE template_used = 'welcome_email';