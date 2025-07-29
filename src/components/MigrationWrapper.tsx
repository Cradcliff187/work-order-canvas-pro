/**
 * Migration Wrapper Component
 * Provides unified API for components during migration period
 */

import React, { createContext, useContext } from 'react';
import { useMigrationAuth } from '@/hooks/useMigrationAuth';
import { usePermissionBridge } from '@/hooks/usePermissionBridge';
import type { DualCompatUser } from '@/lib/migration/dualTypeAuth';
import type { PermissionBridge } from '@/hooks/usePermissionBridge';

interface MigrationContextType {
  // Dual-compatible user object
  user: DualCompatUser | null;
  loading: boolean;
  
  // Permission bridge
  permissions: PermissionBridge;
  
  // Legacy compatibility (for components not yet migrated)
  legacyProfile: any; // Original profile from AuthContext
  legacyUserOrganization: any; // Original userOrganization from AuthContext
  
  // Migration state
  migrationFlags: {
    useOrganizationAuth: boolean;
    useOrganizationPermissions: boolean;
    useOrganizationNavigation: boolean;
    useOrganizationWorkOrders: boolean;
  };
}

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

export const useMigrationContext = (): MigrationContextType => {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error('useMigrationContext must be used within MigrationWrapper');
  }
  return context;
};

interface MigrationWrapperProps {
  children: React.ReactNode;
}

export const MigrationWrapper: React.FC<MigrationWrapperProps> = ({ children }) => {
  const migrationAuth = useMigrationAuth();
  const permissions = usePermissionBridge(migrationAuth.user);

  const contextValue: MigrationContextType = {
    user: migrationAuth.user,
    loading: migrationAuth.loading,
    permissions,
    legacyProfile: migrationAuth.profile,
    legacyUserOrganization: migrationAuth.userOrganization,
    migrationFlags: migrationAuth.migrationFlags,
  };

  return (
    <MigrationContext.Provider value={contextValue}>
      {children}
    </MigrationContext.Provider>
  );
};

/**
 * Higher-order component for gradual component migration
 */
export const withMigrationBridge = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function MigratedComponent(props: P) {
    return (
      <MigrationWrapper>
        <Component {...props} />
      </MigrationWrapper>
    );
  };
};

/**
 * Hook for components that need both old and new APIs during migration
 */
export const useLegacyCompatibility = () => {
  const { legacyProfile, legacyUserOrganization, permissions, migrationFlags } = useMigrationContext();
  
  return {
    // Legacy API (for backward compatibility)
    profile: legacyProfile,
    userOrganization: legacyUserOrganization,
    
    // New API (for migrated components)
    isAdmin: permissions.isAdmin,
    isEmployee: permissions.isEmployee,
    isPartner: permissions.isPartner,
    isSubcontractor: permissions.isSubcontractor,
    hasInternalAccess: permissions.hasInternalAccess,
    canManageUsers: permissions.canManageUsers,
    canViewFinancials: permissions.canViewFinancials,
    
    // Migration state
    isUsingOrganizationAuth: migrationFlags.useOrganizationAuth,
    
    // Helper to check if component should use new API
    shouldUseNewAPI: (feature: keyof typeof migrationFlags) => migrationFlags[feature],
  };
};