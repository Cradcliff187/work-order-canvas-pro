
import type { Database } from '@/integrations/supabase/types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type UserType = 'admin' | 'partner' | 'subcontractor' | 'employee';
type OrganizationType = 'partner' | 'subcontractor' | 'internal';

/**
 * Maps user types to their corresponding organization types
 */
export function getUserTypeOrganizationTypes(userType: UserType): OrganizationType[] {
  switch (userType) {
    case 'partner':
      return ['partner'];
    case 'subcontractor':
      return ['subcontractor'];
    case 'employee':
      return ['internal'];
    case 'admin':
      return ['partner', 'subcontractor', 'internal']; // Admins can see all
    default:
      return [];
  }
}

/**
 * Filters organizations based on user type and active status
 */
export function filterOrganizationsByUserType(
  organizations: Organization[],
  userType: UserType
): Organization[] {
  console.log('🔍 [filterOrganizationsByUserType] DEBUG - Input parameters:', {
    organizationsCount: organizations?.length || 0,
    userType,
    organizations: organizations?.map(org => ({
      id: org.id,
      name: org.name,
      type: org.organization_type,
      isActive: org.is_active
    }))
  });
  
  const allowedTypes = getUserTypeOrganizationTypes(userType);
  
  console.log('🎯 [filterOrganizationsByUserType] DEBUG - Allowed types for user type:', {
    userType,
    allowedTypes
  });
  
  const filteredOrganizations = organizations.filter(org => 
    org.is_active && allowedTypes.includes(org.organization_type)
  );
  
  console.log('✅ [filterOrganizationsByUserType] DEBUG - Filtered results:', {
    originalCount: organizations?.length || 0,
    filteredCount: filteredOrganizations.length,
    filteredOrganizations: filteredOrganizations.map(org => ({
      id: org.id,
      name: org.name,
      type: org.organization_type,
      isActive: org.is_active
    }))
  });
  
  return filteredOrganizations;
}
