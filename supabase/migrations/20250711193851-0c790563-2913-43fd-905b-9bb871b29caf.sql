-- Enable RLS on invoice_attachments table
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can manage all invoice attachments
CREATE POLICY "Admins can manage all invoice attachments"
ON public.invoice_attachments
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Policy 2: Subcontractors can manage own invoice attachments
CREATE POLICY "Subcontractors can manage own invoice attachments"
ON public.invoice_attachments
FOR ALL
USING (
  auth_user_type() = 'subcontractor'
  AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_attachments.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
)
WITH CHECK (
  auth_user_type() = 'subcontractor'
  AND uploaded_by = auth_profile_id()
  AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_attachments.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
);

-- Policy 3: View invoice attachments (financial privacy enforced)
CREATE POLICY "View invoice attachments"
ON public.invoice_attachments
FOR SELECT
USING (
  -- Admins can view all
  auth_is_admin()
  -- Subcontractors can view their own organization's attachments
  OR (
    auth_user_type() = 'subcontractor'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_attachments.invoice_id
      AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
    )
  )
  -- Partners CANNOT view invoice attachments (financial privacy)
);

-- Add table comment for documentation
COMMENT ON TABLE public.invoice_attachments IS 
'Stores uploaded invoice documents with financial privacy - partners cannot access invoice attachments';