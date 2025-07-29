/**
 * Organization-based permission types for the work order management system
 * 
 * This file defines the core types used for organization-centric authentication
 * and authorization, replacing the previous user_type based system.
 */

// Core organization types matching database enums
export type OrganizationType = 'internal' | 'partner' | 'subcontractor';
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'employee' | 'member';

/**
 * Organization member relationship
 */
export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  created_at: string;
}

/**
 * Organization context for user sessions
 */
export interface OrganizationContext {
  id: string;
  name: string;
  organization_type: OrganizationType;
  member_role?: OrganizationRole;
  initials?: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

/**
 * Permission matrix based on organization role and type
 */
export interface OrganizationPermissions {
  // User management
  canManageUsers: boolean;
  canViewAllUsers: boolean;
  canCreateUsers: boolean;
  
  // Financial data
  canViewFinancialData: boolean;
  canManageInvoices: boolean;
  canViewCosts: boolean;
  
  // Work order management
  canSubmitWorkOrders: boolean;
  canAssignWork: boolean;
  canApproveWork: boolean;
  canViewAllWorkOrders: boolean;
  canManageWorkOrders: boolean;
  
  // Organization management
  canManageOrganization: boolean;
  canViewOrganizationSettings: boolean;
  
  // System administration
  canManageSystem: boolean;
  canViewSystemHealth: boolean;
  canManageEmailTemplates: boolean;
}

/**
 * Helper type for organization-based access control
 */
export interface AccessControlContext {
  userOrganizations: OrganizationContext[];
  currentOrganization?: OrganizationContext;
  permissions: OrganizationPermissions;
}