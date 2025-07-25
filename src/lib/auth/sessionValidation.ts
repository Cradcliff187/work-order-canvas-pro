import { supabase } from '@/integrations/supabase/client';
import { syncUserMetadataToJWT } from './jwtSync';

interface SessionValidationResult {
  isValid: boolean;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * Validates that both frontend and database authentication are working
 * This ensures auth.uid() will work in database operations
 */
export async function validateAuthSession(): Promise<SessionValidationResult> {
  try {
    // Check frontend session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return {
        isValid: false,
        error: 'No valid frontend session',
        needsRefresh: true
      };
    }

    // Check if database can see the authenticated user
    const { data: dbAuthCheck, error: dbError } = await supabase.rpc('debug_auth_state');
    
    if (dbError) {
      console.warn('Database auth check failed:', dbError);
      return {
        isValid: false,
        error: 'Database authentication check failed',
        needsRefresh: true
      };
    }

    // If auth.uid() is null in database but we have a frontend session, sync needed
    if (!(dbAuthCheck as any)?.auth_uid && session.user) {
      console.log('Database auth.uid() is null, triggering JWT sync');
      
      // Try to sync JWT metadata
      const syncResult = await syncUserMetadataToJWT();
      if (syncResult.error) {
        return {
          isValid: false,
          error: 'Failed to sync authentication metadata',
          needsRefresh: true
        };
      }

      // Verify sync worked
      const { data: retryCheck } = await supabase.rpc('debug_auth_state');
      if (!(retryCheck as any)?.auth_uid) {
        return {
          isValid: false,
          error: 'Authentication sync verification failed',
          needsRefresh: true
        };
      }
    }

    return { isValid: true };

  } catch (error) {
    console.error('Session validation error:', error);
    return {
      isValid: false,
      error: 'Unexpected validation error',
      needsRefresh: true
    };
  }
}

/**
 * Ensures authentication is valid before performing critical operations
 * Automatically refreshes session if needed
 */
export async function ensureAuthenticatedSession(): Promise<boolean> {
  const validation = await validateAuthSession();
  
  if (validation.isValid) {
    return true;
  }

  if (validation.needsRefresh) {
    try {
      // Try to refresh the session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        console.error('Session refresh failed:', error);
        return false;
      }

      // Validate again after refresh
      const revalidation = await validateAuthSession();
      return revalidation.isValid;
      
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

  return false;
}