import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { isFeatureEnabled } from '@/lib/migration/featureFlags';

// Try to use enhanced auth context if available
let useEnhancedAuth: any = null;
try {
  const enhancedAuthModule = require('@/contexts/EnhancedAuthContext');
  useEnhancedAuth = enhancedAuthModule.useEnhancedAuth;
} catch {
  // Enhanced auth not available, continue with legacy
}

export const useOrganizationValidation = () => {
  const legacyAuth = useAuth();
  const { data: userOrganizations, isLoading: legacyLoading } = useUserOrganizations();
  
  // Try to use enhanced auth if available and authentication migration is enabled
  let enhancedAuth = null;
  if (useEnhancedAuth && isFeatureEnabled('useOrganizationAuthentication')) {
    try {
      enhancedAuth = useEnhancedAuth();
    } catch {
      // Enhanced auth not available, use legacy
    }
  }

  const hasMultipleOrganizations = useMemo(() => {
    if (enhancedAuth) {
      // Using organization-based authentication
      const user = enhancedAuth.user;
      if (!user || enhancedAuth.hasAdminAccess) return false;
      
      return user.organization_memberships && user.organization_memberships.length > 1;
    } else {
      // Using legacy authentication - check for admin through migration context
      const profile = legacyAuth.profile;
      if (!profile) return false;
      
      // Check if user has admin access through organization system
      try {
        const { useMigrationContext } = require('@/components/MigrationWrapper');
        const { enhancedPermissions } = useMigrationContext();
        if (enhancedPermissions?.isAdmin) return false;
      } catch {
        // Migration context not available, continue
      }
      
      return userOrganizations && userOrganizations.length > 1;
    }
  }, [enhancedAuth, legacyAuth.profile, userOrganizations]);
  
  const organizationCount = enhancedAuth 
    ? enhancedAuth.user?.organization_memberships?.length || 0
    : userOrganizations?.length || 0;
    
  const isLoading = enhancedAuth ? enhancedAuth.isLoading : legacyLoading;
  const shouldShowValidation = !isLoading && hasMultipleOrganizations;
  
  // Determine user type for error display
  let userType = 'subcontractor';
  if (enhancedAuth) {
    const primaryOrg = enhancedAuth.primaryOrganization;
    if (primaryOrg?.organization?.organization_type === 'internal') {
      userType = primaryOrg.role === 'admin' ? 'admin' : 'employee';
    } else if (primaryOrg?.organization?.organization_type === 'partner') {
      userType = 'partner';
    }
  } else {
    // Legacy fallback - determine from organization data or default
    userType = 'subcontractor';
  }
  
  return {
    hasMultipleOrganizations,
    organizationCount,
    isLoading,
    shouldShowValidation,
    userType,
    isUsingOrganizationAuth: !!enhancedAuth,
  };
};