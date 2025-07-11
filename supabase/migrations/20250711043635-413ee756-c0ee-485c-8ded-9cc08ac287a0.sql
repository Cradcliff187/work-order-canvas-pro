-- Enhanced Financial RLS Policies with Status Restrictions
-- This migration improves invoice security by restricting updates based on status

-- Drop and recreate the subcontractor invoice UPDATE policy with status restrictions
DROP POLICY IF EXISTS "Subcontractors can update invoices from their organization" ON public.invoices;

CREATE POLICY "Subcontractors can update modifiable invoices from their organization"
ON public.invoices FOR UPDATE
TO authenticated
USING (
  auth_user_type() = 'subcontractor' 
  AND auth_user_belongs_to_organization(subcontractor_organization_id)
  AND status IN ('submitted', 'rejected')
)
WITH CHECK (
  auth_user_type() = 'subcontractor' 
  AND auth_user_belongs_to_organization(subcontractor_organization_id)
  AND status IN ('submitted', 'rejected')
  -- Prevent subcontractors from changing critical fields
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND paid_at IS NULL
  AND payment_reference IS NULL
);

-- Add a trigger to prevent unauthorized status changes by subcontractors
CREATE OR REPLACE FUNCTION public.validate_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow admins to change any status
  IF public.auth_user_type() = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- For subcontractors, prevent certain status transitions
  IF public.auth_user_type() = 'subcontractor' THEN
    -- Can only change from 'rejected' back to 'submitted'
    IF OLD.status = 'rejected' AND NEW.status = 'submitted' THEN
      RETURN NEW;
    END IF;
    
    -- Cannot change status in any other way
    IF OLD.status != NEW.status THEN
      RAISE EXCEPTION 'Subcontractors can only resubmit rejected invoices';
    END IF;
    
    -- Prevent changes to approval/payment fields
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by 
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
      RAISE EXCEPTION 'Subcontractors cannot modify approval or payment fields';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invoice status validation
DROP TRIGGER IF EXISTS validate_invoice_status_trigger ON public.invoices;
CREATE TRIGGER validate_invoice_status_trigger
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_status_change();

-- Add performance index for status-based queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_org ON public.invoices(status, subcontractor_organization_id);

-- Add audit logging comment
COMMENT ON TRIGGER validate_invoice_status_trigger ON public.invoices IS 
'Prevents unauthorized status changes and field modifications by subcontractors';

-- Ensure invoice_work_orders policy respects parent invoice permissions
DROP POLICY IF EXISTS "Subcontractors can manage invoice work orders for their organization" ON public.invoice_work_orders;

CREATE POLICY "Subcontractors can manage invoice work orders for modifiable invoices"
ON public.invoice_work_orders FOR ALL
TO authenticated
USING (
  auth_user_type() = 'subcontractor' 
  AND EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
    AND i.status IN ('submitted', 'rejected')
  )
)
WITH CHECK (
  auth_user_type() = 'subcontractor' 
  AND EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
    AND i.status IN ('submitted', 'rejected')
  )
);