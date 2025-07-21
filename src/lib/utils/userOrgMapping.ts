
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
  const allowedTypes = getUserTypeOrganizationTypes(userType);
  
  return organizations.filter(org => 
    org.is_active && allowedTypes.includes(org.organization_type)
  );
}
