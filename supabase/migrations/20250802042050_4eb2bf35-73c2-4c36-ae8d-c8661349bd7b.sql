-- Fix critical RLS policy gaps preventing authentication
-- Add missing policies for email_logs and other critical tables

-- Email logs policies (critical for authentication flow)
CREATE POLICY "admins_can_manage_email_logs" ON email_logs
FOR ALL USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "system_can_insert_email_logs" ON email_logs
FOR INSERT WITH CHECK (true);

-- Organization members policies (critical for auth context)
CREATE POLICY "users_can_read_all_memberships" ON organization_members
FOR SELECT USING (true);

-- Profiles policies enhancement
CREATE POLICY "users_can_read_all_profiles" ON profiles
FOR SELECT USING (true);

-- Organizations policies enhancement  
CREATE POLICY "users_can_read_all_organizations" ON organizations
FOR SELECT USING (true);