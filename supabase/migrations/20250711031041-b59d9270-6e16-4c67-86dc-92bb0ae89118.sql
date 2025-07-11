-- Create employee reporting tables for time and expense tracking
-- This migration adds comprehensive employee time reporting and expense receipt management

-- Create employee_reports table for tracking employee time and work
CREATE TABLE public.employee_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0),
  hourly_rate_snapshot DECIMAL(10,2) NOT NULL CHECK (hourly_rate_snapshot >= 0),
  total_labor_cost DECIMAL(10,2) GENERATED ALWAYS AS (hours_worked * hourly_rate_snapshot) STORED,
  work_performed TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT employee_reports_work_order_date_unique UNIQUE(work_order_id, employee_user_id, report_date)
);

-- Create receipts table for employee expense tracking
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  receipt_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create receipt_work_orders junction table for expense allocation
CREATE TABLE public.receipt_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount >= 0),
  allocation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(receipt_id, work_order_id)
);

-- Add performance indexes for employee_reports table
CREATE INDEX idx_employee_reports_work_order ON public.employee_reports(work_order_id);
CREATE INDEX idx_employee_reports_employee ON public.employee_reports(employee_user_id);
CREATE INDEX idx_employee_reports_date ON public.employee_reports(report_date);
CREATE INDEX idx_employee_reports_employee_date ON public.employee_reports(employee_user_id, report_date);

-- Add performance indexes for receipts table
CREATE INDEX idx_receipts_employee ON public.receipts(employee_user_id);
CREATE INDEX idx_receipts_date ON public.receipts(receipt_date);
CREATE INDEX idx_receipts_vendor ON public.receipts(vendor_name);
CREATE INDEX idx_receipts_amount ON public.receipts(amount);

-- Add performance indexes for receipt_work_orders table
CREATE INDEX idx_receipt_work_orders_receipt ON public.receipt_work_orders(receipt_id);
CREATE INDEX idx_receipt_work_orders_work_order ON public.receipt_work_orders(work_order_id);

-- Add standard updated_at triggers
CREATE TRIGGER update_employee_reports_updated_at
  BEFORE UPDATE ON public.employee_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit logging triggers
CREATE TRIGGER audit_employee_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_receipts
  AFTER INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_receipt_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.receipt_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();