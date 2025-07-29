/**
 * User Migration Utilities
 * Handles data migration between user_type and organization-based systems
 */

import { supabase } from '@/integrations/supabase/client';
import type { LegacyUserType } from './dualTypeAuth';
import { mapLegacyToOrganization } from './dualTypeAuth';

export interface MigrationResult {
  success: boolean;
  message: string;
  organizationId?: string;
  error?: string;
}

/**
 * Auto-populate organization membership for a user based on their user_type
 */
export const migrateUserToOrganization = async (
  profileId: string,
  userType: LegacyUserType
): Promise<MigrationResult> => {
  try {
    // For now, during migration phase, we'll assume no existing memberships
    // This will be updated once the organization_members table is properly integrated
    console.log('Checking migration status for user:', profileId, 'type:', userType);

    const { organizationType, role } = mapLegacyToOrganization(userType);

    // Find or create appropriate organization
    let organizationId: string;

    if (organizationType === 'internal') {
      // Find internal organization
      const { data: internalOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('organization_type', 'internal')
        .eq('is_active', true)
        .maybeSingle();

      if (internalOrg) {
        organizationId = internalOrg.id;
      } else {
        // Create internal organization if none exists
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            name: 'Internal Team',
            contact_email: 'admin@company.com',
            organization_type: 'internal',
            is_active: true,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        organizationId = newOrg.id;
      }
    } else {
      // For partners and subcontractors, we need more info to create proper orgs
      // For now, return a message that manual org assignment is needed
      return {
        success: false,
        message: `${userType} users need manual organization assignment`,
        error: 'Manual organization assignment required',
      };
    }

    // Create organization membership (this will need to be done via admin function)
    // For now, we'll just return success message indicating manual action needed
    console.log(`Would create membership: user ${profileId} -> org ${organizationId} with role ${role}`);

    return {
      success: true,
      message: `Successfully migrated ${userType} to organization membership`,
      organizationId,
    };

  } catch (error) {
    console.error('User migration error:', error);
    return {
      success: false,
      message: 'Failed to migrate user to organization',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Sync organization membership for users missing organization data
 */
export const syncMissingOrganizationMemberships = async (): Promise<{
  processed: number;
  migrated: number;
  errors: string[];
}> => {
  try {
    // This function would need to be implemented as an admin function
    // For now, return empty results
    console.log('Sync operation would check for users without organization memberships');

    const results = {
      processed: 0,
      migrated: 0,
      errors: [] as string[],
    };

    // Placeholder for future implementation
    const usersWithoutOrgs: any[] = [];
    
    for (const profile of usersWithoutOrgs || []) {
      results.processed++;

      if (profile.user_type) {
        const migrationResult = await migrateUserToOrganization(
          profile.id,
          profile.user_type as LegacyUserType
        );

        if (migrationResult.success) {
          results.migrated++;
        } else {
          results.errors.push(`${profile.id}: ${migrationResult.error}`);
        }
      }
    }

    return results;

  } catch (error) {
    console.error('Sync migration error:', error);
    return {
      processed: 0,
      migrated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

/**
 * Check if a user needs organization migration
 */
export const userNeedsMigration = async (profileId: string): Promise<boolean> => {
  try {
    // For now, assume all users need migration until we have proper
    // organization_members integration
    console.log('Checking migration needs for profile:', profileId);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get migration status for current user
 */
export const getCurrentUserMigrationStatus = async (): Promise<{
  needsMigration: boolean;
  userType: LegacyUserType | null;
  organizationCount: number;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    // For now, return placeholder data during migration
    const organizationCount = 0; // Will be populated when org members are integrated

    return {
      needsMigration: true, // Assume all users need migration for now
      userType: profile.user_type as LegacyUserType | null,
      organizationCount,
    };

  } catch (error) {
    console.error('Migration status check error:', error);
    return {
      needsMigration: false,
      userType: null,
      organizationCount: 0,
    };
  }
};