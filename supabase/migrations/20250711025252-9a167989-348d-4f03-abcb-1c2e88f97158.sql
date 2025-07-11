-- Create work_order_assignments table for multiple assignees per work order
CREATE TABLE public.work_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('lead', 'support')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, assigned_to)
);

-- Enable RLS (will add policies later)
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;

-- Add performance indexes
CREATE INDEX idx_work_order_assignments_work_order ON public.work_order_assignments(work_order_id);
CREATE INDEX idx_work_order_assignments_assigned_to ON public.work_order_assignments(assigned_to);
CREATE INDEX idx_work_order_assignments_organization ON public.work_order_assignments(assigned_organization_id);
CREATE INDEX idx_work_order_assignments_wo_type ON public.work_order_assignments(work_order_id, assignment_type);
CREATE INDEX idx_work_order_assignments_assignee_type ON public.work_order_assignments(assigned_to, assignment_type);
CREATE INDEX idx_work_order_assignments_assigned_at ON public.work_order_assignments(assigned_at);

-- Add updated_at trigger
CREATE TRIGGER update_work_order_assignments_updated_at
  BEFORE UPDATE ON public.work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_work_order_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();