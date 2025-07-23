-- Comprehensive Admin Access RLS Policies
-- Enable admins to have full CRUD access to all system tables

-- Enable RLS on all tables first
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipient_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "admins_can_select_organizations" ON public.organizations FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_organizations" ON public.organizations FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_organizations" ON public.organizations FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Work Orders policies
CREATE POLICY "admins_can_select_work_orders" ON public.work_orders FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_work_orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_work_orders" ON public.work_orders FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_work_orders" ON public.work_orders FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Work Order Reports policies
CREATE POLICY "admins_can_select_work_order_reports" ON public.work_order_reports FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_work_order_reports" ON public.work_order_reports FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_work_order_reports" ON public.work_order_reports FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_work_order_reports" ON public.work_order_reports FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Work Order Assignments policies
CREATE POLICY "admins_can_select_work_order_assignments" ON public.work_order_assignments FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_work_order_assignments" ON public.work_order_assignments FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_work_order_assignments" ON public.work_order_assignments FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_work_order_assignments" ON public.work_order_assignments FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- User Organizations policies
CREATE POLICY "admins_can_select_user_organizations" ON public.user_organizations FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_user_organizations" ON public.user_organizations FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_user_organizations" ON public.user_organizations FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_user_organizations" ON public.user_organizations FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Trades policies
CREATE POLICY "admins_can_select_trades" ON public.trades FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_trades" ON public.trades FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_trades" ON public.trades FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Partner Locations policies
CREATE POLICY "admins_can_select_partner_locations" ON public.partner_locations FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_partner_locations" ON public.partner_locations FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_partner_locations" ON public.partner_locations FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_partner_locations" ON public.partner_locations FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Invoices policies
CREATE POLICY "admins_can_select_invoices" ON public.invoices FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_invoices" ON public.invoices FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Invoice Attachments policies
CREATE POLICY "admins_can_select_invoice_attachments" ON public.invoice_attachments FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_invoice_attachments" ON public.invoice_attachments FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_invoice_attachments" ON public.invoice_attachments FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_invoice_attachments" ON public.invoice_attachments FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Invoice Work Orders policies
CREATE POLICY "admins_can_select_invoice_work_orders" ON public.invoice_work_orders FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_invoice_work_orders" ON public.invoice_work_orders FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_invoice_work_orders" ON public.invoice_work_orders FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_invoice_work_orders" ON public.invoice_work_orders FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Receipts policies
CREATE POLICY "admins_can_select_receipts" ON public.receipts FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_receipts" ON public.receipts FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_receipts" ON public.receipts FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_receipts" ON public.receipts FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Receipt Work Orders policies
CREATE POLICY "admins_can_select_receipt_work_orders" ON public.receipt_work_orders FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_receipt_work_orders" ON public.receipt_work_orders FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_receipt_work_orders" ON public.receipt_work_orders FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_receipt_work_orders" ON public.receipt_work_orders FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Employee Reports policies
CREATE POLICY "admins_can_select_employee_reports" ON public.employee_reports FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_employee_reports" ON public.employee_reports FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_employee_reports" ON public.employee_reports FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_employee_reports" ON public.employee_reports FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Audit Logs policies
CREATE POLICY "admins_can_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_audit_logs" ON public.audit_logs FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_audit_logs" ON public.audit_logs FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Email Templates policies
CREATE POLICY "admins_can_select_email_templates" ON public.email_templates FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_email_templates" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_email_templates" ON public.email_templates FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_email_templates" ON public.email_templates FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Email Logs policies
CREATE POLICY "admins_can_select_email_logs" ON public.email_logs FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_email_logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_email_logs" ON public.email_logs FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_email_logs" ON public.email_logs FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Email Settings policies
CREATE POLICY "admins_can_select_email_settings" ON public.email_settings FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_email_settings" ON public.email_settings FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_email_settings" ON public.email_settings FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_email_settings" ON public.email_settings FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Email Recipient Settings policies
CREATE POLICY "admins_can_select_email_recipient_settings" ON public.email_recipient_settings FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_email_recipient_settings" ON public.email_recipient_settings FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_email_recipient_settings" ON public.email_recipient_settings FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_email_recipient_settings" ON public.email_recipient_settings FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- System Settings policies
CREATE POLICY "admins_can_select_system_settings" ON public.system_settings FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_system_settings" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_system_settings" ON public.system_settings FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_system_settings" ON public.system_settings FOR DELETE TO authenticated USING (public.jwt_is_admin());

-- Work Order Attachments policies
CREATE POLICY "admins_can_select_work_order_attachments" ON public.work_order_attachments FOR SELECT TO authenticated USING (public.jwt_is_admin());
CREATE POLICY "admins_can_insert_work_order_attachments" ON public.work_order_attachments FOR INSERT TO authenticated WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_update_work_order_attachments" ON public.work_order_attachments FOR UPDATE TO authenticated USING (public.jwt_is_admin()) WITH CHECK (public.jwt_is_admin());
CREATE POLICY "admins_can_delete_work_order_attachments" ON public.work_order_attachments FOR DELETE TO authenticated USING (public.jwt_is_admin());