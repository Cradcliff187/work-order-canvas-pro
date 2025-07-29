import { useAuth } from '@/contexts/AuthContext';
import { useMigrationContext } from '@/components/MigrationWrapper';
import { isFeatureEnabled } from '@/lib/migration/featureFlags';

// Try to use enhanced auth context if available
let useEnhancedAuth: any = null;
try {
  const enhancedAuthModule = require('@/contexts/EnhancedAuthContext');
  useEnhancedAuth = enhancedAuthModule.useEnhancedAuth;
} catch {
  // Enhanced auth not available, continue with legacy
}

export const useUserProfile = () => {
  const legacyAuth = useAuth();
  
  // Try to use enhanced auth if available and authentication migration is enabled
  let enhancedAuth = null;
  if (useEnhancedAuth && isFeatureEnabled('useOrganizationAuthentication')) {
    try {
      enhancedAuth = useEnhancedAuth();
    } catch {
      // Enhanced auth not available, use legacy
    }
  }
  
  // Choose which auth system to use
  const { profile, loading, isImpersonating } = enhancedAuth || legacyAuth;
  
  // Try to use migration context for enhanced permissions
  let migrationPermissions = null;
  try {
    const { enhancedPermissions, migrationFlags } = useMigrationContext();
    if (migrationFlags.useOrganizationPermissions) {
      migrationPermissions = enhancedPermissions;
    }
  } catch {
    // Not wrapped in MigrationWrapper, use legacy behavior
  }

  const isAdmin = () => migrationPermissions?.isAdmin || profile?.user_type === 'admin';
  const isEmployee = () => migrationPermissions?.isEmployee || profile?.user_type === 'employee';
  const isPartner = () => migrationPermissions?.isPartner || profile?.user_type === 'partner';
  const isSubcontractor = () => migrationPermissions?.isSubcontractor || profile?.user_type === 'subcontractor';

  const hasPermission = (requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee') => {
    if (!profile) return false;
    
    // Use enhanced permissions if available
    if (migrationPermissions) {
      const userTypeHierarchy = {
        'admin': 4,
        'employee': 3,
        'partner': 2,
        'subcontractor': 1
      };

      const userLevel = userTypeHierarchy[migrationPermissions.getUserType() as keyof typeof userTypeHierarchy];
      const requiredLevel = userTypeHierarchy[requiredUserType];

      return userLevel >= requiredLevel;
    }
    
    // Fallback to legacy behavior
    const userTypeHierarchy = {
      'admin': 4,
      'employee': 3,
      'partner': 2,
      'subcontractor': 1
    };

    const userLevel = userTypeHierarchy[profile.user_type];
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
    userType: migrationPermissions?.getUserType() || profile?.user_type,
    isImpersonating
  };
};