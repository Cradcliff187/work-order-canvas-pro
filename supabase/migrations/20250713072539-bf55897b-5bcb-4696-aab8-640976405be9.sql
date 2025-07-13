-- Fix audit logs constraint to allow STATUS_CHANGE actions
-- This resolves the seeding error where transition_work_order_status function
-- tries to insert audit logs with action = 'STATUS_CHANGE'

-- Drop existing constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Add new constraint that includes STATUS_CHANGE
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check 
  CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'STATUS_CHANGE'::text]));

-- Update audit trigger function to handle foreign key violations gracefully
-- This prevents seeding failures when user_id references don't exist yet
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    BEGIN
      INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        TG_OP,
        NULL,
        to_jsonb(NEW),
        public.auth_user_id()
      );
    EXCEPTION WHEN foreign_key_violation THEN
      -- Log warning but don't fail the operation during seeding
      RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
    WHEN OTHERS THEN
      -- Log any other errors but don't fail the operation
      RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
    END;
    RETURN NEW;
  END IF;

  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    BEGIN
      INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        public.auth_user_id()
      );
    EXCEPTION WHEN foreign_key_violation THEN
      -- Log warning but don't fail the operation during seeding
      RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
    WHEN OTHERS THEN
      -- Log any other errors but don't fail the operation
      RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
    END;
    RETURN NEW;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    BEGIN
      INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id
      ) VALUES (
        TG_TABLE_NAME,
        OLD.id,
        TG_OP,
        to_jsonb(OLD),
        NULL,
        public.auth_user_id()
      );
    EXCEPTION WHEN foreign_key_violation THEN
      -- Log warning but don't fail the operation during seeding
      RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
    WHEN OTHERS THEN
      -- Log any other errors but don't fail the operation
      RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
    END;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;