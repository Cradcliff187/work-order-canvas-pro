import { supabase } from '@/integrations/supabase/client';
import { getUserTypeOrganizationTypes } from './userOrgMapping';
import type { UserOrganization } from '@/hooks/useUserOrganization';

type UserType = 'admin' | 'partner' | 'subcontractor' | 'employee';
type OrganizationType = 'partner' | 'subcontractor' | 'internal';

// Custom error types for validation failures
export class OrganizationValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'OrganizationValidationError';
  }
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validates if a user type can belong to an organization type
 */
export function validateUserOrganizationType(
  userType: UserType, 
  organizationType: OrganizationType
): boolean {
  const allowedTypes = getUserTypeOrganizationTypes(userType);
  return allowedTypes.includes(organizationType);
}

/**
 * Returns the expected organization type for a user type
 */
export function getUserExpectedOrganizationType(userType: UserType): OrganizationType | null {
  switch (userType) {
    case 'partner':
      return 'partner';
    case 'subcontractor':
      return 'subcontractor';
    case 'employee':
      return 'internal';
    case 'admin':
      return null; // Admins don't have a specific org type
    default:
      return null;
  }
}

/**
 * Boolean check for type compatibility
 */
export function isValidUserTypeForOrganization(
  userType: UserType, 
  organizationType: OrganizationType
): boolean {
  return validateUserOrganizationType(userType, organizationType);
}

/**
 * Validates if a specific user can belong to a specific organization
 */
export function validateUserOrganization(
  user: { user_type: UserType }, 
  organization: { organization_type: OrganizationType }
): ValidationResult {
  if (!user || !organization) {
    return {
      isValid: false,
      error: 'User or organization is missing',
      code: 'MISSING_DATA'
    };
  }

  const isValid = validateUserOrganizationType(user.user_type, organization.organization_type);
  
  if (!isValid) {
    const expectedType = getUserExpectedOrganizationType(user.user_type);
    return {
      isValid: false,
      error: `User type '${user.user_type}' cannot belong to organization type '${organization.organization_type}'. Expected: ${expectedType || 'any'}`,
      code: 'TYPE_MISMATCH'
    };
  }

  return { isValid: true };
}

/**
 * Async function to get user's single organization
 */
export async function getUserSingleOrganization(userId: string): Promise<UserOrganization | null> {
  try {
    // First get the profile to check user type
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new OrganizationValidationError(
        `Failed to fetch user profile: ${profileError?.message}`,
        'PROFILE_NOT_FOUND'
      );
    }

    // Admins don't have a specific organization
    if (profile.user_type === 'admin') {
      return null;
    }

    // Get the user's organization
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        organization:organizations (
          id,
          name,
          organization_type,
          initials,
          contact_email,
          contact_phone,
          address,
          uses_partner_location_numbers
        )
      `)
      .eq('user_id', profile.id)
      .limit(1)
      .single();

    if (error) {
      throw new OrganizationValidationError(
        `Failed to fetch user organization: ${error.message}`,
        'ORGANIZATION_NOT_FOUND'
      );
    }

    const organization = data?.organization as UserOrganization;
    
    // Validate that the user type matches organization type
    if (organization) {
      const validation = validateUserOrganization(
        { user_type: profile.user_type }, 
        { organization_type: organization.organization_type }
      );
      
      if (!validation.isValid) {
        throw new OrganizationValidationError(
          validation.error || 'Invalid user-organization type combination',
          validation.code || 'VALIDATION_FAILED'
        );
      }
    }

    return organization || null;
  } catch (error) {
    if (error instanceof OrganizationValidationError) {
      throw error;
    }
    throw new OrganizationValidationError(
      `Failed to get user organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FETCH_ERROR'
    );
  }
}

/**
 * Validates current authenticated user's organization
 */
export async function validateCurrentUserOrganization(): Promise<ValidationResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        isValid: false,
        error: 'No authenticated user',
        code: 'NO_AUTH'
      };
    }

    const organization = await getUserSingleOrganization(user.id);
    
    // For admins, having no organization is valid
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profile?.user_type === 'admin') {
      return { isValid: true };
    }

    // For non-admins, they should have an organization
    if (!organization) {
      return {
        isValid: false,
        error: 'User has no associated organization',
        code: 'NO_ORGANIZATION'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Returns all valid organization types for a user type (reusing existing logic)
 */
export function getOrganizationTypesForUserType(userType: UserType): OrganizationType[] {
  return getUserTypeOrganizationTypes(userType);
}