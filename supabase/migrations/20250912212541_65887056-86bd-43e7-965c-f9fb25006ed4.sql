-- Ensure audit log action values are uppercase and remove strict constraint blocking deletes
BEGIN;

-- 1) Drop any CHECK constraints on audit_logs.action (name-agnostic)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'audit_logs'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%action%'
  LOOP
    EXECUTE format('ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS %I;', r.conname);
  END LOOP;
END $$;

-- 2) Update the employee_reports audit function to write uppercase actions
CREATE OR REPLACE FUNCTION public.audit_employee_reports_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('employee_reports', NEW.id, v_action, NULL, to_jsonb(NEW), public.auth_profile_id_safe());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('employee_reports', NEW.id, v_action, to_jsonb(OLD), to_jsonb(NEW), public.auth_profile_id_safe());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('employee_reports', OLD.id, v_action, to_jsonb(OLD), NULL, public.auth_profile_id_safe());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3) Normalize existing data to uppercase for basic actions
UPDATE public.audit_logs
SET action = UPPER(action)
WHERE action IN ('insert','update','delete');

COMMIT;