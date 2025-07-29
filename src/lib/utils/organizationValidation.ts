import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { OrganizationType, OrganizationRole } from '@/types/auth.types';

type Organization = Database['public']['Tables']['organizations']['Row'];

/**
 * Custom error class for organization validation failures
 */
export class OrganizationValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'OrganizationValidationError';
  }
}

/**
 * Result of organization validation checks
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

/**
 * Gets all valid organization types for a given role
 */
export function getOrganizationTypesForRole(role: OrganizationRole): OrganizationType[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return ['partner', 'subcontractor', 'internal']; // Can access all organization types
    case 'manager':
      return ['partner', 'subcontractor', 'internal']; // Managers can access all types
    case 'employee':
      return ['internal']; // Employees typically only in internal organizations
    case 'member':
      return ['partner', 'subcontractor']; // Members in partner/subcontractor orgs
    default:
      return [];
  }
}

/**
 * Validates if a role is allowed for a specific organization type
 */
export function validateRoleOrganizationType(
  role: OrganizationRole,
  organizationType: OrganizationType
): boolean {
  const allowedOrgTypes = getOrganizationTypesForRole(role);
  return allowedOrgTypes.includes(organizationType);
}

/**
 * Validates an organization membership relationship
 */
export function validateOrganizationMembership(
  role: OrganizationRole,
  organization: { organization_type: OrganizationType }
): ValidationResult {
  if (!validateRoleOrganizationType(role, organization.organization_type)) {
    return {
      isValid: false,
      error: `Role '${role}' is not compatible with organization type '${organization.organization_type}'`,
      code: 'INCOMPATIBLE_ROLE_TYPE'
    };
  }

  return { isValid: true };
}

interface UserOrganization {
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
 * Fetches a user's organizations from Supabase through user_organizations (legacy table)
 * TODO: Replace with organization_members table in later migration phases
 */
export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  try {
    const { data: organizationData, error } = await supabase
      .from('user_organizations')
      .select(`
        organization:organizations (
          id,
          name,
          organization_type,
          initials,
          contact_email,
          contact_phone,
          address
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch user organizations:', error);
      throw new OrganizationValidationError(
        `Failed to fetch user organizations: ${error.message}`,
        'FETCH_ERROR'
      );
    }

    if (!organizationData || organizationData.length === 0) {
      console.log('No organizations found for user:', userId);
      return [];
    }

    return organizationData
      .filter(item => item.organization)
      .map(item => ({
        id: item.organization!.id,
        name: item.organization!.name,
        organization_type: item.organization!.organization_type,
        member_role: 'member' as OrganizationRole, // Default role until migration complete
        initials: item.organization!.initials || undefined,
        contact_email: item.organization!.contact_email,
        contact_phone: item.organization!.contact_phone || undefined,
        address: item.organization!.address || undefined
      }));
  } catch (error) {
    if (error instanceof OrganizationValidationError) {
      throw error;
    }
    
    console.error('Unexpected error in getUserOrganizations:', error);
    throw new OrganizationValidationError(
      'Unexpected error fetching user organizations',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Fetches a user's single organization (for users who should only have one)
 */
export async function getUserSingleOrganization(userId: string): Promise<UserOrganization | null> {
  try {
    const organizations = await getUserOrganizations(userId);

    if (organizations.length === 0) {
      return null;
    }

    if (organizations.length > 1) {
      console.warn('User has multiple organizations - cannot determine single organization:', userId);
      throw new OrganizationValidationError(
        'User has multiple organizations',
        'MULTIPLE_ORGANIZATIONS'
      );
    }

    return organizations[0];
  } catch (error) {
    if (error instanceof OrganizationValidationError) {
      throw error;
    }
    
    console.error('Unexpected error in getUserSingleOrganization:', error);
    throw new OrganizationValidationError(
      'Unexpected error fetching user organization',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Validates the current user's organization status
 */
export async function validateCurrentUserOrganization(): Promise<ValidationResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        isValid: false,
        error: 'No authenticated user found',
        code: 'NO_USER'
      };
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        isValid: false,
        error: 'User profile not found',
        code: 'NO_PROFILE'
      };
    }

    // Check user's organization memberships
    const organizations = await getUserOrganizations(profile.id);
    
    if (organizations.length === 0) {
      return {
        isValid: false,
        error: 'User must be associated with at least one organization',
        code: 'NO_ORGANIZATION'
      };
    }

    return { isValid: true };
  } catch (error) {
    if (error instanceof OrganizationValidationError) {
      return {
        isValid: false,
        error: error.message,
        code: error.code
      };
    }

    console.error('Unexpected error in validateCurrentUserOrganization:', error);
    return {
      isValid: false,
      error: 'Unexpected error during validation',
      code: 'UNKNOWN_ERROR'
    };
  }
}