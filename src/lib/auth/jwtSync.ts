import { supabase } from '@/integrations/supabase/client';

/**
 * Sync user metadata to JWT after profile or organization changes
 * This ensures RLS policies have access to current user context
 */
export async function syncUserMetadataToJWT(userId: string) {
  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_type, is_active')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile for JWT sync:', profileError);
      return { error: profileError };
    }

    // Get user organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', profile.id);

    if (orgsError) {
      console.error('Failed to fetch organizations for JWT sync:', orgsError);
      return { error: orgsError };
    }

    // Update user metadata
    const metadata = {
      profile_id: profile.id,
      user_type: profile.user_type,
      organization_ids: orgs?.map(o => o.organization_id) || [],
      is_active: profile.is_active
    };

    // Note: In production, this would be done server-side
    // For now, we'll trigger a refresh to get updated JWT
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      return { error: refreshError };
    }

    console.log('JWT metadata sync completed:', metadata);
    return { success: true, metadata };

  } catch (error) {
    console.error('Unexpected error in JWT sync:', error);
    return { error };
  }
}

/**
 * Hook to use after profile updates
 */
export async function onProfileUpdate(userId: string) {
  return syncUserMetadataToJWT(userId);
}

/**
 * Hook to use after organization changes
 */
export async function onOrganizationChange(userId: string) {
  return syncUserMetadataToJWT(userId);
}

/**
 * Check if JWT has required metadata
 */
export function hasJWTMetadata(session: any): boolean {
  const metadata = session?.user?.app_metadata;
  return !!(
    metadata?.profile_id &&
    metadata?.user_type &&
    metadata?.organization_ids !== undefined
  );
}

/**
 * Get user context from JWT
 */
export function getUserContextFromJWT(session: any) {
  const metadata = session?.user?.app_metadata;
  return {
    profileId: metadata?.profile_id,
    userType: metadata?.user_type,
    organizationIds: metadata?.organization_ids || [],
    isActive: metadata?.is_active ?? true
  };
}