import { useAuth } from '@/contexts/AuthContext';

// Organization-based user profile hook
export const useUserProfile = () => {
  const { profile, loading, userOrganizations } = useAuth();
  
  // Get organization types for permission checking
  const internalMembership = userOrganizations.find(org => 
    org.organization?.organization_type === 'internal'
  );
  const partnerMembership = userOrganizations.find(org => 
    org.organization?.organization_type === 'partner'
  );
  const subcontractorMembership = userOrganizations.find(org => 
    org.organization?.organization_type === 'subcontractor'
  );

  // Organization-based permission checks
  const isAdmin = () => internalMembership?.role === 'admin';
  const isEmployee = () => internalMembership && internalMembership.role !== 'admin';
  const isPartner = () => !!partnerMembership;
  const isSubcontractor = () => !!subcontractorMembership;

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile) return false;
    
    switch (requiredUserType) {
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

  // Determine primary user type
  const getUserType = () => {
    if (isAdmin()) return 'admin';
    if (isEmployee()) return 'employee';
    if (isPartner()) return 'partner';
    if (isSubcontractor()) return 'subcontractor';
    return 'subcontractor'; // default
  };

  return {
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: getUserType(),
    isImpersonating: false // No impersonation in new system
  };
};