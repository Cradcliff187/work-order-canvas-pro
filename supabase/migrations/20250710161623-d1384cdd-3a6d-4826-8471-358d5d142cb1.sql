-- Migration: 003_fix_schema_alignment.sql
-- Align database schema with the 12-table comprehensive plan

-- Phase 1: Handle Foreign Key Dependencies
-- Remove project_id from work_orders table
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_project_id_fkey;
ALTER TABLE public.work_orders DROP COLUMN IF EXISTS project_id;

-- Phase 2: Remove Unwanted Tables and Their Policies

-- Drop RLS policies for projects table
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Partners can manage projects in their organizations" ON public.projects;
DROP POLICY IF EXISTS "Subcontractors can view assigned projects" ON public.projects;

-- Drop RLS policies for work_order_comments table
DROP POLICY IF EXISTS "Admins can manage all work order comments" ON public.work_order_comments;
DROP POLICY IF EXISTS "Partners can manage comments on their organization work orders" ON public.work_order_comments;
DROP POLICY IF EXISTS "Subcontractors can manage comments on assigned work orders" ON public.work_order_comments;

-- Drop foreign key constraints first
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_project_manager_id_fkey;
ALTER TABLE public.work_order_comments DROP CONSTRAINT IF EXISTS work_order_comments_author_id_fkey;
ALTER TABLE public.work_order_comments DROP CONSTRAINT IF EXISTS work_order_comments_work_order_id_fkey;

-- Drop the unwanted tables
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.work_order_comments CASCADE;

-- Phase 3: Add Missing Indexes for Performance

-- Indexes for work_orders table
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_status ON public.work_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_status ON public.work_orders(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_trade ON public.work_orders(trade_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON public.work_orders(created_by);

-- Indexes for user_organizations table
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON public.user_organizations(organization_id);

-- Indexes for work_order_reports table
CREATE INDEX IF NOT EXISTS idx_work_order_reports_work_order ON public.work_order_reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_reports_subcontractor ON public.work_order_reports(subcontractor_user_id);
CREATE INDEX IF NOT EXISTS idx_work_order_reports_status ON public.work_order_reports(status);

-- Indexes for work_order_attachments table
CREATE INDEX IF NOT EXISTS idx_work_order_attachments_work_order ON public.work_order_attachments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_attachments_report ON public.work_order_attachments(work_order_report_id);
CREATE INDEX IF NOT EXISTS idx_work_order_attachments_uploader ON public.work_order_attachments(uploaded_by_user_id);

-- Indexes for email_logs table
CREATE INDEX IF NOT EXISTS idx_email_logs_work_order ON public.email_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Indexes for organizations table
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_contact_email ON public.organizations(contact_email);

-- Indexes for trades table
CREATE INDEX IF NOT EXISTS idx_trades_active ON public.trades(is_active);

-- Indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Phase 4: Verification Comments
-- The following 12 tables should now exist and match the comprehensive plan:
-- 1. organizations ✅
-- 2. user_organizations ✅ 
-- 3. profiles ✅
-- 4. trades ✅
-- 5. work_orders ✅ (project_id removed)
-- 6. work_order_reports ✅
-- 7. work_order_attachments ✅
-- 8. email_templates ✅
-- 9. email_logs ✅
-- 10. email_settings ✅
-- 11. system_settings ✅
-- 12. audit_logs ✅

-- Schema is now aligned with the 12-table comprehensive plan