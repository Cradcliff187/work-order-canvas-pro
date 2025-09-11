-- Create audit trigger function for time entries
CREATE OR REPLACE FUNCTION public.audit_time_entry_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.time_entry_audits (
      time_entry_id,
      action,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      'created',
      to_jsonb(NEW),
      NEW.employee_user_id
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Only log if there are actual changes
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.time_entry_audits (
        time_entry_id,
        action,
        old_values,
        new_values,
        changed_by
      ) VALUES (
        NEW.id,
        CASE 
          WHEN OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN 'approval_status_changed'
          ELSE 'updated'
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        COALESCE(NEW.approved_by, auth_profile_id_safe())
      );
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.time_entry_audits (
      time_entry_id,
      action,
      old_values,
      changed_by
    ) VALUES (
      OLD.id,
      'deleted',
      to_jsonb(OLD),
      auth_profile_id_safe()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on employee_reports table
DROP TRIGGER IF EXISTS audit_employee_reports_changes ON public.employee_reports;
CREATE TRIGGER audit_employee_reports_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_reports
  FOR EACH ROW EXECUTE FUNCTION public.audit_time_entry_changes();

-- Add RLS policies for time_entry_audits table
DROP POLICY IF EXISTS "admins_can_view_audit_logs" ON public.time_entry_audits;
CREATE POLICY "admins_can_view_audit_logs" ON public.time_entry_audits
  FOR SELECT USING (jwt_is_admin());

DROP POLICY IF EXISTS "employees_can_view_own_audit_logs" ON public.time_entry_audits;
CREATE POLICY "employees_can_view_own_audit_logs" ON public.time_entry_audits
  FOR SELECT USING (
    time_entry_id IN (
      SELECT id FROM employee_reports 
      WHERE employee_user_id = auth_profile_id_safe()
    )
  );

DROP POLICY IF EXISTS "system_can_create_audit_logs" ON public.time_entry_audits;
CREATE POLICY "system_can_create_audit_logs" ON public.time_entry_audits
  FOR INSERT WITH CHECK (true);