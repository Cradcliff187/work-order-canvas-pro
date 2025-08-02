-- EMERGENCY FIX PART 2: Enable RLS on ALL remaining tables
-- This fixes the "RLS Disabled in Public" errors

-- Enable RLS on all remaining tables that need it
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipient_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_location_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trigger_debug_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;