import type { Database } from '@/integrations/supabase/types';

// Organization types from database enum
export type OrganizationType = Database['public']['Enums']['organization_type'];

// Organization roles from database enum  
export type OrganizationRole = Database['public']['Enums']['organization_role'];

// Profile type without user_type
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Organization type
export type Organization = Database['public']['Tables']['organizations']['Row'];

// Organization member relationship
export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrganizationRole;
  created_at: string | null;
  organization?: Organization;
  profile?: Profile;
}

// Enhanced profile with organization membership
export interface ProfileWithOrganization extends Profile {
  organization_members?: OrganizationMember[];
}

// Permission helper types
export interface UserPermissions {
  isInternal: boolean;
  isPartner: boolean;
  isSubcontractor: boolean;
  hasInternalRole: (roles: OrganizationRole[]) => boolean;
  isOrganizationType: (type: OrganizationType) => boolean;
  organizationType: OrganizationType | null;
  organizationRole: OrganizationRole | null;
  organizationId: string | null;
  organizationName: string | null;
}

// Legacy user type mapping for backward compatibility during migration
export function mapOrganizationToLegacyUserType(
  organizationType: OrganizationType | null,
  role: OrganizationRole | null
): 'admin' | 'partner' | 'subcontractor' | 'employee' | null {
  if (!organizationType) return null;
  
  if (organizationType === 'internal') {
    if (role === 'admin' || role === 'owner') return 'admin';
    if (role === 'employee') return 'employee';
    return 'admin'; // Default for internal
  }
  
  if (organizationType === 'partner') return 'partner';
  if (organizationType === 'subcontractor') return 'subcontractor';
  
  return null;
}

// Helper to check if user has specific internal roles
export function hasInternalRole(
  organizationType: OrganizationType | null,
  userRole: OrganizationRole | null,
  requiredRoles: OrganizationRole[]
): boolean {
  if (organizationType !== 'internal') return false;
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

// Helper to check organization type
export function isOrganizationType(
  userOrgType: OrganizationType | null,
  checkType: OrganizationType
): boolean {
  return userOrgType === checkType;
}

// Auth context value type
export interface AuthContextValue {
  user: any; // Supabase user
  profile: Profile | null;
  organizationMember: OrganizationMember | null;
  permissions: UserPermissions;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  impersonateUser?: (userId: string) => Promise<void>;
  stopImpersonating?: () => void;
  isImpersonating?: boolean;
  realProfile?: Profile | null;
  realUserId?: string | null;
  viewingProfile?: Profile | null;
}