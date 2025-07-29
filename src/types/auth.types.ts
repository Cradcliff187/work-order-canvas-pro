/**
 * Organization-based authentication and permission types
 * 
 * This file defines the core types for the organization-based permission system
 * that replaces the previous user_type based approach.
 */

import type { Database } from '@/integrations/supabase/types';

// Organization types from the database
export type OrganizationType = 'internal' | 'partner' | 'subcontractor';

// Organization roles from the database  
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'employee' | 'member';

// Organization member interface matching database schema
export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    organization_type: OrganizationType;
    initials?: string;
    contact_email: string;
    contact_phone?: string;
    address?: string;
    uses_partner_location_numbers?: boolean;
    is_active: boolean;
  };
}

// User with organization memberships
export interface UserWithOrganizations {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  is_employee: boolean;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  organization_memberships: OrganizationMember[];
}

// Organization context for permission checking
export interface OrganizationContext {
  organizationId: string;
  organizationType: OrganizationType;
  userRole: OrganizationRole;
}

// Permission check functions type
export type PermissionChecker = (context: OrganizationContext) => boolean;

// Auth context state
export interface AuthState {
  user: UserWithOrganizations | null;
  isLoading: boolean;
  primaryOrganization: OrganizationMember | null;
  hasInternalAccess: boolean;
  hasAdminAccess: boolean;
}