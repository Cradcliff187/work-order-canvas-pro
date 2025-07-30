import { useAuth } from '@/contexts/AuthContext';

// ORGANIZATION-BASED: Pure organization role system
export const useUserProfile = () => {
  const { profile, loading, userOrganizations } = useAuth();
  
  // Get organization memberships for permission checking
  const internalMembership = userOrganizations.find(org => 
    org.organization?.organization_type === 'internal'
  );
  const partnerMemberships = userOrganizations.filter(org => 
    org.organization?.organization_type === 'partner'
  );
  const subcontractorMemberships = userOrganizations.filter(org => 
    org.organization?.organization_type === 'subcontractor'
  );

  // Pure organization-based permission checks
  const isAdmin = () => internalMembership?.role === 'admin';
  const isEmployee = () => internalMembership && ['employee', 'manager'].includes(internalMembership.role);
  const isPartner = () => partnerMemberships.length > 0;
  const isSubcontractor = () => subcontractorMemberships.length > 0;

  const hasPermission = (requiredRole: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile) return false;
    
    switch (requiredRole) {
      case 'admin':
        return isAdmin();
      case 'employee':
        return isAdmin() || isEmployee();
      case 'partner':
        return isAdmin() || isEmployee() || isPartner();
      case 'subcontractor':
        return true; // All authenticated users can access subcontractor features
      default:
        return false;
    }
  };

  // Determine primary role based on organization memberships
  const getPrimaryRole = () => {
    if (isAdmin()) return 'admin';
    if (isEmployee()) return 'employee';
    if (isPartner()) return 'partner';
    if (isSubcontractor()) return 'subcontractor';
    return null; // No valid organization membership
  };

  return {
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: getPrimaryRole(), // Keep for backward compatibility
    primaryRole: getPrimaryRole(),
    internalMembership,
    partnerMemberships,
    subcontractorMemberships,
    isImpersonating: false
  };
};