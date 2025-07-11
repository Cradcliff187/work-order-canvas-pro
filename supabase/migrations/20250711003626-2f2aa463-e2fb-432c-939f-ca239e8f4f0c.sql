-- Fix audit constraint to match trigger action values
DROP CONSTRAINT IF EXISTS audit_logs_action_check ON audit_logs;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check 
  CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]));