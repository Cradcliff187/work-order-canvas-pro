-- Add missing unique constraint on organizations name for upsert operations
ALTER TABLE public.organizations ADD CONSTRAINT organizations_name_unique UNIQUE (name);

-- Add performance indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_organizations_contact_email ON public.organizations(contact_email);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);

-- Add missing unique constraint on email_templates template_name if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_templates_template_name_unique'
    ) THEN
        ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_template_name_unique UNIQUE (template_name);
    END IF;
END $$;

-- Add performance indexes for email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON public.email_templates(is_active);

-- Add missing indexes for work orders for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_trade_id ON public.work_orders(trade_id);

-- Add indexes for user_organizations
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON public.user_organizations(organization_id);