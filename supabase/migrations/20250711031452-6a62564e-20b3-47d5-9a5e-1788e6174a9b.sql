-- Add partner reference fields and organization assignment to work_orders
ALTER TABLE public.work_orders ADD COLUMN partner_po_number TEXT;
ALTER TABLE public.work_orders ADD COLUMN partner_location_number TEXT;
ALTER TABLE public.work_orders ADD COLUMN location_address TEXT;
ALTER TABLE public.work_orders ADD COLUMN location_name TEXT;
ALTER TABLE public.work_orders ADD COLUMN assigned_organization_id UUID REFERENCES public.organizations(id);

-- Add smart numbering fields to organizations
ALTER TABLE public.organizations ADD COLUMN initials TEXT;
ALTER TABLE public.organizations ADD COLUMN next_sequence_number INTEGER DEFAULT 1;

-- Create partner_locations table for future location management
CREATE TABLE public.partner_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_number TEXT NOT NULL,
  location_name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, location_number)
);

-- Add indexes for performance
CREATE INDEX idx_work_orders_partner_po ON public.work_orders(partner_po_number);
CREATE INDEX idx_work_orders_partner_location ON public.work_orders(partner_location_number);
CREATE INDEX idx_work_orders_assigned_org ON public.work_orders(assigned_organization_id);
CREATE INDEX idx_work_orders_location_name ON public.work_orders(location_name);
CREATE INDEX idx_organizations_initials ON public.organizations(initials);
CREATE INDEX idx_partner_locations_org ON public.partner_locations(organization_id);
CREATE INDEX idx_partner_locations_number ON public.partner_locations(location_number);
CREATE INDEX idx_partner_locations_active ON public.partner_locations(is_active);

-- Add updated_at trigger for partner_locations
CREATE TRIGGER update_partner_locations_updated_at
  BEFORE UPDATE ON public.partner_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger for partner_locations
CREATE TRIGGER audit_partner_locations
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();