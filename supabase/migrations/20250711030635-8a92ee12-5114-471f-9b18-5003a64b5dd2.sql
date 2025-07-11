-- Create invoice management tables for subcontractor billing
-- This migration adds comprehensive invoice management with dual numbering system

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_invoice_number TEXT NOT NULL UNIQUE,
  external_invoice_number TEXT,
  subcontractor_organization_id UUID NOT NULL REFERENCES public.organizations(id),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_work_orders junction table
CREATE TABLE public.invoice_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id),
  work_order_report_id UUID REFERENCES public.work_order_reports(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, work_order_id)
);

-- Create auto-numbering function for internal invoice numbers
CREATE OR REPLACE FUNCTION public.generate_internal_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Get next sequence number for current year
  SELECT COALESCE(MAX(
    CASE 
      WHEN internal_invoice_number ~ ('^INV-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(internal_invoice_number FROM LENGTH('INV-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM public.invoices;
  
  invoice_num := 'INV-' || current_year || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN invoice_num;
END;
$$;

-- Create trigger function for auto-generating internal invoice numbers
CREATE OR REPLACE FUNCTION public.trigger_generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.internal_invoice_number IS NULL OR NEW.internal_invoice_number = '' THEN
    NEW.internal_invoice_number := public.generate_internal_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate internal invoice number on insert
CREATE TRIGGER generate_internal_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_invoice_number();

-- Add performance indexes for invoices table
CREATE INDEX idx_invoices_organization ON public.invoices(subcontractor_organization_id);
CREATE INDEX idx_invoices_submitted_by ON public.invoices(submitted_by);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_internal_number ON public.invoices(internal_invoice_number);
CREATE INDEX idx_invoices_approved_by ON public.invoices(approved_by);
CREATE INDEX idx_invoices_submitted_at ON public.invoices(submitted_at);
CREATE INDEX idx_invoices_paid_at ON public.invoices(paid_at);
CREATE INDEX idx_invoices_org_status ON public.invoices(subcontractor_organization_id, status);
CREATE INDEX idx_invoices_status_dates ON public.invoices(status, submitted_at, paid_at);

-- Add performance indexes for invoice_work_orders table
CREATE INDEX idx_invoice_work_orders_invoice ON public.invoice_work_orders(invoice_id);
CREATE INDEX idx_invoice_work_orders_work_order ON public.invoice_work_orders(work_order_id);
CREATE INDEX idx_invoice_work_orders_report ON public.invoice_work_orders(work_order_report_id);

-- Add standard updated_at trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit logging triggers
CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_invoice_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();