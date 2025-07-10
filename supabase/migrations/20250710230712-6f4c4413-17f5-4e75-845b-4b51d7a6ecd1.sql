-- Migration: Add Audit Triggers for Complete Audit Trail
-- This migration creates a comprehensive audit logging system that automatically
-- tracks all INSERT, UPDATE, and DELETE operations across all core tables.

-- ============================================================================
-- PHASE 1: Create Auth Helper Function (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid();
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.auth_user_id() IS 
'Helper function to safely get the current authenticated user ID for audit logging';

-- ============================================================================
-- PHASE 2: Create Generic Audit Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
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
      public.auth_user_id()
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
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
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      public.auth_user_id()
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
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
      public.auth_user_id()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main operation
  RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.audit_trigger_function() IS 
'Generic audit trigger function that logs all INSERT, UPDATE, and DELETE operations with complete before/after state tracking';

-- ============================================================================
-- PHASE 3: Create Audit Triggers for All Core Tables
-- ============================================================================

-- 1. Organizations table
DROP TRIGGER IF EXISTS audit_trigger_organizations ON public.organizations;
CREATE TRIGGER audit_trigger_organizations
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 2. User Organizations table
DROP TRIGGER IF EXISTS audit_trigger_user_organizations ON public.user_organizations;
CREATE TRIGGER audit_trigger_user_organizations
  AFTER INSERT OR UPDATE OR DELETE ON public.user_organizations
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 3. Profiles table
DROP TRIGGER IF EXISTS audit_trigger_profiles ON public.profiles;
CREATE TRIGGER audit_trigger_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 4. Trades table
DROP TRIGGER IF EXISTS audit_trigger_trades ON public.trades;
CREATE TRIGGER audit_trigger_trades
  AFTER INSERT OR UPDATE OR DELETE ON public.trades
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 5. Work Orders table
DROP TRIGGER IF EXISTS audit_trigger_work_orders ON public.work_orders;
CREATE TRIGGER audit_trigger_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.work_orders
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 6. Work Order Reports table
DROP TRIGGER IF EXISTS audit_trigger_work_order_reports ON public.work_order_reports;
CREATE TRIGGER audit_trigger_work_order_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.work_order_reports
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 7. Work Order Attachments table
DROP TRIGGER IF EXISTS audit_trigger_work_order_attachments ON public.work_order_attachments;
CREATE TRIGGER audit_trigger_work_order_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.work_order_attachments
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 8. Email Templates table
DROP TRIGGER IF EXISTS audit_trigger_email_templates ON public.email_templates;
CREATE TRIGGER audit_trigger_email_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.email_templates
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 9. Email Logs table
DROP TRIGGER IF EXISTS audit_trigger_email_logs ON public.email_logs;
CREATE TRIGGER audit_trigger_email_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.email_logs
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 10. Email Settings table
DROP TRIGGER IF EXISTS audit_trigger_email_settings ON public.email_settings;
CREATE TRIGGER audit_trigger_email_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.email_settings
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- 11. System Settings table
DROP TRIGGER IF EXISTS audit_trigger_system_settings ON public.system_settings;
CREATE TRIGGER audit_trigger_system_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW 
  EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================================================
-- PHASE 4: Create Indexes for Query Performance
-- ============================================================================

-- Index for querying audit logs by table and record
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
ON public.audit_logs (table_name, record_id);

-- Index for querying audit logs by user and time
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time 
ON public.audit_logs (user_id, created_at DESC);

-- Index for querying audit logs by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON public.audit_logs (action, created_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action_time 
ON public.audit_logs (table_name, action, created_at DESC);

-- ============================================================================
-- PHASE 5: Update RLS Policy for Audit Logs
-- ============================================================================

-- Ensure audit_logs table has RLS enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- Create admin-only view policy
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (is_admin());

-- ============================================================================
-- PHASE 6: Documentation and Comments
-- ============================================================================

-- Add trigger comments for documentation
COMMENT ON TRIGGER audit_trigger_organizations ON public.organizations IS 
'Automatically logs all changes to organization records';

COMMENT ON TRIGGER audit_trigger_user_organizations ON public.user_organizations IS 
'Automatically logs all changes to user-organization relationship records';

COMMENT ON TRIGGER audit_trigger_profiles ON public.profiles IS 
'Automatically logs all changes to user profile records';

COMMENT ON TRIGGER audit_trigger_trades ON public.trades IS 
'Automatically logs all changes to trade/skill category records';

COMMENT ON TRIGGER audit_trigger_work_orders ON public.work_orders IS 
'Automatically logs all changes to work order records';

COMMENT ON TRIGGER audit_trigger_work_order_reports ON public.work_order_reports IS 
'Automatically logs all changes to work order report records';

COMMENT ON TRIGGER audit_trigger_work_order_attachments ON public.work_order_attachments IS 
'Automatically logs all changes to work order attachment records';

COMMENT ON TRIGGER audit_trigger_email_templates ON public.email_templates IS 
'Automatically logs all changes to email template records';

COMMENT ON TRIGGER audit_trigger_email_logs ON public.email_logs IS 
'Automatically logs all changes to email log records';

COMMENT ON TRIGGER audit_trigger_email_settings ON public.email_settings IS 
'Automatically logs all changes to email settings records';

COMMENT ON TRIGGER audit_trigger_system_settings ON public.system_settings IS 
'Automatically logs all changes to system settings records';

-- ============================================================================
-- Migration Complete - Audit System Active
-- ============================================================================

-- This migration provides:
-- 1. Complete audit trail for all DML operations (INSERT/UPDATE/DELETE)
-- 2. Automatic logging with user identification via auth_user_id()
-- 3. Full before/after state capture in JSONB format
-- 4. Robust error handling that prevents audit failures from blocking operations
-- 5. Performance optimization through strategic indexing
-- 6. Comprehensive coverage of all 11 core application tables
-- 7. Exclusion of audit_logs table itself to prevent recursion
-- 8. Security through SECURITY DEFINER function execution
-- 9. Compliance-ready audit trail for regulatory requirements
-- 10. Developer-friendly documentation and comments

-- Tables audited: organizations, user_organizations, profiles, trades,
-- work_orders, work_order_reports, work_order_attachments, email_templates,
-- email_logs, email_settings, system_settings

-- The audit system is now ACTIVE and will automatically capture all changes!