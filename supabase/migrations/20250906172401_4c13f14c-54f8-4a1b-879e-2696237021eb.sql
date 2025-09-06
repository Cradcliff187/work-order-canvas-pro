-- Complete the audit system with proper triggers and IP capture
-- First, ensure we have the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_partner_invoice_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO partner_invoice_audit_log (
      invoice_id,
      action_type,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      NEW.id,
      'CREATE',
      jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'status', NEW.status,
        'total_amount', NEW.total_amount,
        'partner_organization_id', NEW.partner_organization_id
      ),
      auth_profile_id_safe(),
      inet_client_addr(),
      'database_trigger'
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO partner_invoice_audit_log (
      invoice_id,
      action_type,
      old_values,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'STATUS_CHANGE'
        ELSE 'UPDATE'
      END,
      jsonb_build_object(
        'invoice_number', OLD.invoice_number,
        'status', OLD.status,
        'total_amount', OLD.total_amount,
        'sent_at', OLD.sent_at,
        'payment_date', OLD.payment_date,
        'pdf_url', OLD.pdf_url
      ),
      jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'status', NEW.status,
        'total_amount', NEW.total_amount,
        'sent_at', NEW.sent_at,
        'payment_date', NEW.payment_date,
        'pdf_url', NEW.pdf_url
      ),
      auth_profile_id_safe(),
      inet_client_addr(),
      'database_trigger'
    );
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    INSERT INTO partner_invoice_audit_log (
      invoice_id,
      action_type,
      old_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      OLD.id,
      'DELETE',
      jsonb_build_object(
        'invoice_number', OLD.invoice_number,
        'status', OLD.status,
        'total_amount', OLD.total_amount
      ),
      auth_profile_id_safe(),
      inet_client_addr(),
      'database_trigger'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS partner_invoice_audit_trigger ON partner_invoices;

-- Create the trigger for all operations
CREATE TRIGGER partner_invoice_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON partner_invoices
  FOR EACH ROW
  EXECUTE FUNCTION audit_partner_invoice_changes();

-- Add performance indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_invoice_id 
  ON partner_invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_created_at 
  ON partner_invoice_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_action_type 
  ON partner_invoice_audit_log(action_type);

-- Add invoice number sequence management
CREATE OR REPLACE FUNCTION generate_partner_invoice_number(partner_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_initials text;
  year_suffix text;
  next_number integer;
  invoice_number text;
BEGIN
  -- Get organization initials
  SELECT initials INTO org_initials
  FROM organizations 
  WHERE id = partner_org_id;
  
  IF org_initials IS NULL THEN
    RAISE EXCEPTION 'Organization not found or missing initials';
  END IF;
  
  -- Get current year suffix
  year_suffix := EXTRACT(year FROM CURRENT_DATE)::text;
  
  -- Get next sequence number for this organization and year
  WITH current_max AS (
    SELECT COALESCE(MAX(
      CASE 
        WHEN invoice_number ~ ('^' || org_initials || '-' || year_suffix || '-(\d+)$')
        THEN (regexp_match(invoice_number, '^' || org_initials || '-' || year_suffix || '-(\d+)$'))[1]::integer
        ELSE 0
      END
    ), 0) as max_num
    FROM partner_invoices pi
    JOIN organizations o ON o.id = pi.partner_organization_id
    WHERE o.id = partner_org_id
  )
  SELECT max_num + 1 INTO next_number FROM current_max;
  
  -- Format: ABC-2024-001
  invoice_number := org_initials || '-' || year_suffix || '-' || LPAD(next_number::text, 3, '0');
  
  RETURN invoice_number;
END;
$$;