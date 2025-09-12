-- Fix audit system issues for employee_reports deletion

-- 1. Check if time_entry_audits table exists and drop problematic foreign keys if they exist
DO $$ 
BEGIN
    -- Drop foreign key constraint from time_entry_audits if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'time_entry_audits_time_entry_id_fkey' 
               AND table_name = 'time_entry_audits') THEN
        ALTER TABLE time_entry_audits DROP CONSTRAINT time_entry_audits_time_entry_id_fkey;
    END IF;
END $$;

-- 2. Remove duplicate audit triggers on employee_reports if they exist
DROP TRIGGER IF EXISTS employee_reports_audit_trigger ON employee_reports;
DROP TRIGGER IF EXISTS audit_trigger_row ON employee_reports;

-- 3. Fix the generic audit trigger function to handle missing users safely
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            COALESCE(auth_profile_id_safe(), '00000000-0000-0000-0000-000000000000'::uuid)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            COALESCE(auth_profile_id_safe(), '00000000-0000-0000-0000-000000000000'::uuid)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            new_values,
            user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            to_jsonb(NEW),
            COALESCE(auth_profile_id_safe(), '00000000-0000-0000-0000-000000000000'::uuid)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a clean audit trigger for employee_reports 
CREATE TRIGGER employee_reports_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON employee_reports
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();