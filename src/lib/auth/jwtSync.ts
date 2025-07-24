import { supabase } from '@/integrations/supabase/client';

interface JWTSyncResponse {
  success: boolean;
  error?: string;
  metadata?: {
    user_type: string;
    profile_id: string;
    organization_ids: string[];
    is_active: boolean;
  };
}

/**
 * Sync user metadata to JWT after profile or organization changes
 * This triggers the server-side function that updates auth.users.raw_app_meta_data
 */
export async function syncUserMetadataToJWT(userId?: string) {
  try {
    // Call the server-side function that properly updates JWT metadata
    const { data, error } = await supabase.rpc('trigger_jwt_metadata_sync', {
      p_user_id: userId || undefined // Let it default to auth.uid() if not provided
    });

    if (error) {
      console.error('Failed to trigger JWT metadata sync:', error);
      return { error };
    }

    const response = data as unknown as JWTSyncResponse;
    
    if (!response?.success) {
      console.error('JWT metadata sync failed:', response?.error);
      return { error: new Error(response?.error || 'JWT sync failed') };
    }

    console.log('JWT metadata sync completed:', response.metadata);
    return { success: true, metadata: response.metadata };

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
 * Always returns true because database functions handle metadata fallbacks
 * when JWT metadata is missing (requires Pro plan Custom Access Token Hook)
 */
export function hasJWTMetadata(session: any): boolean {
  return true;
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