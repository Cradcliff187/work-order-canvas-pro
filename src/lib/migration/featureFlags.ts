/**
 * Phase 7: Legacy System Cleanup - COMPLETE
 * Organization-based authentication system is now fully active
 * All legacy flags maintained for backward compatibility but set to true
 */

export interface MigrationFlags {
  useOrganizationAuth: boolean;
  useOrganizationPermissions: boolean;
  useOrganizationNavigation: boolean;
  useOrganizationWorkOrders: boolean;
  useOrganizationAuthentication: boolean;
  enableDualTypeSupport: boolean;
  // Phase 7 additions
  useOrganizationSystem: boolean;
  migrationComplete: boolean;
}

// All migration phases complete - organization system is now the primary system
export const MIGRATION_FLAGS: MigrationFlags = {
  // All legacy flags set to true (migration complete)
  enableDualTypeSupport: true,
  useOrganizationAuth: true,
  useOrganizationPermissions: true,
  useOrganizationNavigation: true,
  useOrganizationWorkOrders: true,
  useOrganizationAuthentication: true,
  // Phase 7: Legacy system cleanup complete
  useOrganizationSystem: true,
  migrationComplete: true,
};

// Helper to check if feature is enabled
export const isFeatureEnabled = (feature: keyof MigrationFlags): boolean => {
  return MIGRATION_FLAGS[feature];
};

// Legacy compatibility helpers
export const isOrganizationSystemEnabled = (): boolean => {
  return MIGRATION_FLAGS.useOrganizationSystem;
};

export const isMigrationComplete = (): boolean => {
  return MIGRATION_FLAGS.migrationComplete;
};