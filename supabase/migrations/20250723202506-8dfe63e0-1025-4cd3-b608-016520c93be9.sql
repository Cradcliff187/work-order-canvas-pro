-- Employee RLS Policies Implementation
-- Employees have broad operational access but cannot manage users or system configuration

-- ==============================================
-- PHASE 1: Core Work Management (Full CRUD)
-- ==============================================

-- Work Orders - Full access to manage all work orders
CREATE POLICY "employees_can_select_work_orders" 
ON public.work_orders 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_work_orders" 
ON public.work_orders 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_update_work_orders" 
ON public.work_orders 
FOR UPDATE 
USING (jwt_user_type() = 'employee')
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_delete_work_orders" 
ON public.work_orders 
FOR DELETE 
USING (jwt_user_type() = 'employee');

-- Work Order Assignments - Full access to manage assignments
CREATE POLICY "employees_can_select_work_order_assignments" 
ON public.work_order_assignments 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_work_order_assignments" 
ON public.work_order_assignments 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_update_work_order_assignments" 
ON public.work_order_assignments 
FOR UPDATE 
USING (jwt_user_type() = 'employee')
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_delete_work_order_assignments" 
ON public.work_order_assignments 
FOR DELETE 
USING (jwt_user_type() = 'employee');

-- Work Order Reports - Full access to review and approve reports
CREATE POLICY "employees_can_select_work_order_reports" 
ON public.work_order_reports 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_work_order_reports" 
ON public.work_order_reports 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_update_work_order_reports" 
ON public.work_order_reports 
FOR UPDATE 
USING (jwt_user_type() = 'employee')
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_delete_work_order_reports" 
ON public.work_order_reports 
FOR DELETE 
USING (jwt_user_type() = 'employee');

-- Work Order Attachments - Full access to manage attachments
CREATE POLICY "employees_can_select_work_order_attachments" 
ON public.work_order_attachments 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_work_order_attachments" 
ON public.work_order_attachments 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_update_work_order_attachments" 
ON public.work_order_attachments 
FOR UPDATE 
USING (jwt_user_type() = 'employee')
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_delete_work_order_attachments" 
ON public.work_order_attachments 
FOR DELETE 
USING (jwt_user_type() = 'employee');

-- ==============================================
-- PHASE 2: User & Organization Visibility (SELECT only)
-- ==============================================

-- Organizations - View all organizations
CREATE POLICY "employees_can_select_organizations" 
ON public.organizations 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- User Organizations - View user-organization relationships
CREATE POLICY "employees_can_select_user_organizations" 
ON public.user_organizations 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Partner Locations - View partner locations
CREATE POLICY "employees_can_select_partner_locations" 
ON public.partner_locations 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Trades - View available trades
CREATE POLICY "employees_can_select_trades" 
ON public.trades 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Profiles - View all profiles for user management needs
CREATE POLICY "employees_can_select_all_profiles" 
ON public.profiles 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- ==============================================
-- PHASE 3: Employee Operations (Full access to own data, SELECT others)
-- ==============================================

-- Employee Reports - Full CRUD on own reports, SELECT others for management
CREATE POLICY "employees_can_select_all_employee_reports" 
ON public.employee_reports 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_employee_reports" 
ON public.employee_reports 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id());

CREATE POLICY "employees_can_update_own_employee_reports" 
ON public.employee_reports 
FOR UPDATE 
USING (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id())
WITH CHECK (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id());

CREATE POLICY "employees_can_delete_own_employee_reports" 
ON public.employee_reports 
FOR DELETE 
USING (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id());

-- Receipts - Full CRUD on own receipts, SELECT others for oversight
CREATE POLICY "employees_can_select_all_receipts" 
ON public.receipts 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_receipts" 
ON public.receipts 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id());

CREATE POLICY "employees_can_update_own_receipts" 
ON public.receipts 
FOR UPDATE 
USING (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id())
WITH CHECK (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id());

CREATE POLICY "employees_can_delete_own_receipts" 
ON public.receipts 
FOR DELETE 
USING (jwt_user_type() = 'employee' AND employee_user_id = jwt_profile_id());

-- Receipt Work Orders - Full access to allocate receipts
CREATE POLICY "employees_can_select_receipt_work_orders" 
ON public.receipt_work_orders 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_receipt_work_orders" 
ON public.receipt_work_orders 
FOR INSERT 
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_update_receipt_work_orders" 
ON public.receipt_work_orders 
FOR UPDATE 
USING (jwt_user_type() = 'employee')
WITH CHECK (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_delete_receipt_work_orders" 
ON public.receipt_work_orders 
FOR DELETE 
USING (jwt_user_type() = 'employee');

-- ==============================================
-- PHASE 4: Financial Oversight (SELECT, limited UPDATE)
-- ==============================================

-- Invoices - SELECT all, UPDATE for approval workflow only
CREATE POLICY "employees_can_select_invoices" 
ON public.invoices 
FOR SELECT 
USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_update_invoices_approval" 
ON public.invoices 
FOR UPDATE 
USING (jwt_user_type() = 'employee')
WITH CHECK (jwt_user_type() = 'employee');

-- Invoice Work Orders - SELECT to see relationships
CREATE POLICY "employees_can_select_invoice_work_orders" 
ON public.invoice_work_orders 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Invoice Attachments - SELECT to view documentation
CREATE POLICY "employees_can_select_invoice_attachments" 
ON public.invoice_attachments 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- ==============================================
-- PHASE 5: System Monitoring (SELECT only)
-- ==============================================

-- Audit Logs - View system activity
CREATE POLICY "employees_can_select_audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Email Logs - Monitor communications
CREATE POLICY "employees_can_select_email_logs" 
ON public.email_logs 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Email Templates - View templates
CREATE POLICY "employees_can_select_email_templates" 
ON public.email_templates 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Email Settings - View settings
CREATE POLICY "employees_can_select_email_settings" 
ON public.email_settings 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- Email Recipient Settings - View recipient settings
CREATE POLICY "employees_can_select_email_recipient_settings" 
ON public.email_recipient_settings 
FOR SELECT 
USING (jwt_user_type() = 'employee');

-- System Settings - Read configuration
CREATE POLICY "employees_can_select_system_settings" 
ON public.system_settings 
FOR SELECT 
USING (jwt_user_type() = 'employee');