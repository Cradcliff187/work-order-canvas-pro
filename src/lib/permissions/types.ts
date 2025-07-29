/**
 * Phase 2: Permission System Types
 * Defines the types for the new permission system that bridges legacy and organization-based auth
 */

import type { OrganizationType, OrganizationRole, OrganizationMember } from '@/types/auth.types';

// Legacy user type (during migration)
export type LegacyUserType = 'admin' | 'partner' | 'subcontractor' | 'employee';

// Enhanced user interface that supports both systems
export interface EnhancedUser {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_employee: boolean;
  
  // Legacy fields (temporary during migration)
  user_type?: LegacyUserType;
  company_name?: string;
  
  // New organization fields
  organization_memberships?: OrganizationMember[];
  primary_organization?: OrganizationMember;
  
  // Computed fields
  effective_user_type?: LegacyUserType;
  has_internal_access?: boolean;
  has_admin_access?: boolean;
}

// Permission context for organization-based checks
export interface PermissionContext {
  user: EnhancedUser;
  organizationId?: string;
  requiredRole?: OrganizationRole;
  requiredOrgType?: OrganizationType;
}

// Standard permissions enum
export enum Permission {
  // User management
  MANAGE_USERS = 'manage_users',
  VIEW_ALL_USERS = 'view_all_users',
  
  // Work order management  
  MANAGE_WORK_ORDERS = 'manage_work_orders',
  VIEW_ALL_WORK_ORDERS = 'view_all_work_orders',
  ASSIGN_WORK_ORDERS = 'assign_work_orders',
  
  // Financial access
  VIEW_FINANCIAL_DATA = 'view_financial_data',
  MANAGE_INVOICES = 'manage_invoices',
  
  // System administration
  MANAGE_ORGANIZATIONS = 'manage_organizations',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_SYSTEM_HEALTH = 'view_system_health',
  
  // Reports and analytics
  VIEW_ALL_REPORTS = 'view_all_reports',
  MANAGE_REPORTS = 'manage_reports',
}

// Permission check result
export interface PermissionResult {
  granted: boolean;
  reason?: string;
  context?: {
    method: 'legacy' | 'organization';
    organization?: OrganizationMember;
    fallbackUsed?: boolean;
  };
}