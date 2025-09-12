-- Unblock admin time entry deletions by fixing/removing faulty audit triggers on employee_reports
BEGIN;

-- 1) Create a safe, table-specific audit function for employee_reports that correctly handles DELETE using OLD.id
CREATE OR REPLACE FUNCTION public.audit_employee_reports_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('employee_reports', NEW.id, 'insert', NULL, to_jsonb(NEW), public.auth_profile_id_safe());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('employee_reports', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), public.auth_profile_id_safe());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('employee_reports', OLD.id, 'delete', to_jsonb(OLD), NULL, public.auth_profile_id_safe());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2) Drop any existing audit-related triggers on employee_reports to avoid conflicts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'employee_reports'
      AND NOT t.tgisinternal
      AND p.proname ILIKE '%audit%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.employee_reports;', r.tgname);
  END LOOP;
END $$;

-- 3) Recreate a single correct audit trigger for employee_reports
CREATE TRIGGER trg_audit_employee_reports
AFTER INSERT OR UPDATE OR DELETE ON public.employee_reports
FOR EACH ROW EXECUTE FUNCTION public.audit_employee_reports_changes();

COMMIT;