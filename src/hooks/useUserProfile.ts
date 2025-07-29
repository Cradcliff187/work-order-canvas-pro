import { useAuth } from '@/contexts/AuthContext';
import { useMigrationContext } from '@/components/MigrationWrapper';
import { isMigrationComplete } from '@/lib/migration/featureFlags';

// Organization-based user profile hook - Phase 7 complete
export const useUserProfile = () => {
  const { profile, loading, isImpersonating } = useAuth();
  
  // Use migration context for organization-based permissions
  let migrationPermissions = null;
  try {
    const { enhancedPermissions } = useMigrationContext();
    migrationPermissions = enhancedPermissions;
  } catch {
    // Not wrapped in MigrationWrapper, fallback to basic profile checks
  }

  // Organization-based permission checks
  const isAdmin = () => migrationPermissions?.isAdmin ?? false;
  const isEmployee = () => migrationPermissions?.isEmployee ?? false;
  const isPartner = () => migrationPermissions?.isPartner ?? false;
  const isSubcontractor = () => migrationPermissions?.isSubcontractor ?? false;

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile || !migrationPermissions) return false;
    
    const userTypeHierarchy = {
      'admin': 4,
      'employee': 3,
      'partner': 2,
      'subcontractor': 1
    };

    const userLevel = userTypeHierarchy[migrationPermissions.getUserType() as keyof typeof userTypeHierarchy];
    const requiredLevel = userTypeHierarchy[requiredUserType];

    return userLevel >= requiredLevel;
  };

  return {
    profile,
    loading,
    isAdmin,
    isEmployee,
    isPartner,
    isSubcontractor,
    hasPermission,
    userType: migrationPermissions?.getUserType() || 'subcontractor',
    isImpersonating
  };
};