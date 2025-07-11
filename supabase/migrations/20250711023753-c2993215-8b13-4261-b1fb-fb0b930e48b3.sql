-- Add organization type enum
CREATE TYPE public.organization_type AS ENUM ('partner', 'subcontractor', 'internal');

-- Add organization_type column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN organization_type public.organization_type NOT NULL DEFAULT 'partner';

-- Add check constraint for additional validation
ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_type_check 
CHECK (organization_type IN ('partner', 'subcontractor', 'internal'));

-- Add index for performance
CREATE INDEX idx_organizations_type ON public.organizations(organization_type);

-- Add composite index for common queries
CREATE INDEX idx_organizations_type_active ON public.organizations(organization_type, is_active);