/**
 * Migration Feature Flags
 * Controls the gradual migration from user_type to organization-based auth
 */

export interface MigrationFlags {
  useOrganizationAuth: boolean;
  useOrganizationPermissions: boolean;
  useOrganizationNavigation: boolean;
  useOrganizationWorkOrders: boolean;
  enableDualTypeSupport: boolean;
}

// Feature flags for migration phases
export const MIGRATION_FLAGS: MigrationFlags = {
  // Phase 1: Dual type system foundation
  enableDualTypeSupport: true,
  
  // Phase 2: Core auth migration
  useOrganizationAuth: true,
  
  // Phase 3: Permission system migration  
  useOrganizationPermissions: false,
  
  // Phase 4: Navigation migration
  useOrganizationNavigation: false,
  
  // Phase 5: Work order system migration
  useOrganizationWorkOrders: false,
};

// Helper to check if feature is enabled
export const isFeatureEnabled = (feature: keyof MigrationFlags): boolean => {
  return MIGRATION_FLAGS[feature];
};

// Migration phase helpers
export const isMigrationPhase = (phase: number): boolean => {
  switch (phase) {
    case 1: return MIGRATION_FLAGS.enableDualTypeSupport;
    case 2: return MIGRATION_FLAGS.useOrganizationAuth;
    case 3: return MIGRATION_FLAGS.useOrganizationPermissions;
    case 4: return MIGRATION_FLAGS.useOrganizationNavigation;
    case 5: return MIGRATION_FLAGS.useOrganizationWorkOrders;
    default: return false;
  }
};