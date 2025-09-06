-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS partner_invoice_audit_trigger ON public.partner_invoices;

-- Check if the audit log table already exists, create if not
CREATE TABLE IF NOT EXISTS public.partner_invoice_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_partner_invoice_audit_log_invoice'
  ) THEN
    ALTER TABLE public.partner_invoice_audit_log 
    ADD CONSTRAINT fk_partner_invoice_audit_log_invoice 
    FOREIGN KEY (invoice_id) REFERENCES public.partner_invoices(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_partner_invoice_audit_log_user'
  ) THEN
    ALTER TABLE public.partner_invoice_audit_log 
    ADD CONSTRAINT fk_partner_invoice_audit_log_user 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_invoice_id ON public.partner_invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_user_id ON public.partner_invoice_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_created_at ON public.partner_invoice_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_invoice_audit_log_action_type ON public.partner_invoice_audit_log(action_type);

-- Enable RLS
ALTER TABLE public.partner_invoice_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage all partner invoice audit logs" ON public.partner_invoice_audit_log;
DROP POLICY IF EXISTS "Partners can view their own invoice audit logs" ON public.partner_invoice_audit_log;

-- Create RLS policies
CREATE POLICY "Admins can manage all partner invoice audit logs"
ON public.partner_invoice_audit_log
FOR ALL
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "Partners can view their own invoice audit logs"
ON public.partner_invoice_audit_log
FOR SELECT
USING (
  invoice_id IN (
    SELECT pi.id 
    FROM partner_invoices pi
    JOIN organization_members om ON pi.partner_organization_id = om.organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id()
    AND o.organization_type = 'partner'
  )
);

-- Recreate the audit trigger function and trigger
CREATE TRIGGER partner_invoice_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.partner_invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_partner_invoice_status_changes();