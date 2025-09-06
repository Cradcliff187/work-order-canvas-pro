-- Create partner invoice audit log table
CREATE TABLE public.partner_invoice_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'pdf_generated', 'email_sent', 'status_changed'
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add foreign key constraints
  CONSTRAINT fk_partner_invoice_audit_log_invoice 
    FOREIGN KEY (invoice_id) REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_partner_invoice_audit_log_user 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Add indexes for efficient querying
CREATE INDEX idx_partner_invoice_audit_log_invoice_id ON public.partner_invoice_audit_log(invoice_id);
CREATE INDEX idx_partner_invoice_audit_log_user_id ON public.partner_invoice_audit_log(user_id);
CREATE INDEX idx_partner_invoice_audit_log_created_at ON public.partner_invoice_audit_log(created_at DESC);
CREATE INDEX idx_partner_invoice_audit_log_action_type ON public.partner_invoice_audit_log(action_type);

-- Enable RLS
ALTER TABLE public.partner_invoice_audit_log ENABLE ROW LEVEL SECURITY;

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

-- Create audit trigger function for partner invoices
CREATE OR REPLACE FUNCTION public.audit_partner_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_invoice_audit_log (
      invoice_id,
      action_type,
      new_values,
      user_id
    ) VALUES (
      NEW.id,
      'created',
      jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'status', NEW.status,
        'total_amount', NEW.total_amount,
        'partner_organization_id', NEW.partner_organization_id,
        'invoice_date', NEW.invoice_date,
        'due_date', NEW.due_date
      ),
      auth_profile_id_safe()
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Log general updates
    INSERT INTO public.partner_invoice_audit_log (
      invoice_id,
      action_type,
      old_values,
      new_values,
      user_id
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_changed'
        ELSE 'updated'
      END,
      jsonb_build_object(
        'invoice_number', OLD.invoice_number,
        'status', OLD.status,
        'total_amount', OLD.total_amount,
        'invoice_date', OLD.invoice_date,
        'due_date', OLD.due_date,
        'sent_at', OLD.sent_at,
        'payment_date', OLD.payment_date,
        'pdf_url', OLD.pdf_url
      ),
      jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'status', NEW.status,
        'total_amount', NEW.total_amount,
        'invoice_date', NEW.invoice_date,
        'due_date', NEW.due_date,
        'sent_at', NEW.sent_at,
        'payment_date', NEW.payment_date,
        'pdf_url', NEW.pdf_url
      ),
      auth_profile_id_safe()
    );
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.partner_invoice_audit_log (
      invoice_id,
      action_type,
      old_values,
      user_id
    ) VALUES (
      OLD.id,
      'deleted',
      jsonb_build_object(
        'invoice_number', OLD.invoice_number,
        'status', OLD.status,
        'total_amount', OLD.total_amount,
        'partner_organization_id', OLD.partner_organization_id
      ),
      auth_profile_id_safe()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for partner invoices
CREATE TRIGGER partner_invoice_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.partner_invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_partner_invoice_changes();

-- Create function to log application-level actions
CREATE OR REPLACE FUNCTION public.log_partner_invoice_action(
  p_invoice_id UUID,
  p_action_type TEXT,
  p_details JSONB DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.partner_invoice_audit_log (
    invoice_id,
    action_type,
    new_values,
    user_id,
    user_agent,
    ip_address
  ) VALUES (
    p_invoice_id,
    p_action_type,
    p_details,
    auth_profile_id_safe(),
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;