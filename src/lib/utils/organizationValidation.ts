import { supabase } from '@/integrations/supabase/client';
import type { UserOrganization } from '@/hooks/useUserOrganization';
import type { OrganizationType, OrganizationRole } from '@/types/auth.types';

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
 * Validates if an organization exists and is active
 */
export function validateOrganization(
  organization: { organization_type: OrganizationType; is_active?: boolean }
): ValidationResult {
  if (!organization) {
    return {
      isValid: false,
      error: 'Organization is missing',
      code: 'MISSING_DATA'
    };
  }

  if (organization.is_active === false) {
    return {
      isValid: false,
      error: 'Organization is inactive',
      code: 'INACTIVE_ORGANIZATION'
    };
  }

  return { isValid: true };
}

/**
 * Simplified organization validation for migration phase
 */
export async function getUserPrimaryOrganization(userId: string): Promise<UserOrganization | null> {
  try {
    // For now, return null during migration - this will be properly implemented
    // once all components are migrated to organization-based permissions
    console.log('getUserPrimaryOrganization called for userId:', userId);
    return null;
  } catch (error) {
    console.error('Error in getUserPrimaryOrganization:', error);
    return null;
  }
}

/**
 * Validates current authenticated user's organization membership
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

    const organization = await getUserPrimaryOrganization(user.id);
    
    // Users should have an organization membership
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