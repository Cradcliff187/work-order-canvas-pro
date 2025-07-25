import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuthDebugResult {
  frontendAuth: {
    isAuthenticated: boolean;
    userId: string | null;
    profile: any;
    session: any;
  };
  databaseAuth: {
    authState: any;
    syncResult: any;
    error?: string;
  };
  timestamp: string;
}

export const useAuthDebugger = () => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState<AuthDebugResult | null>(null);
  const { user, session, profile } = useAuth();

  const runAuthDebug = async (): Promise<AuthDebugResult> => {
    setIsDebugging(true);
    
    try {
      console.log('🔍 Starting auth debug process...');
      
      // Frontend auth state
      const frontendAuth = {
        isAuthenticated: !!user,
        userId: user?.id || null,
        profile: profile,
        session: session ? {
          access_token: session.access_token ? 'present' : 'missing',
          refresh_token: session.refresh_token ? 'present' : 'missing',
          expires_at: session.expires_at,
          user: session.user ? {
            id: session.user.id,
            email: session.user.email,
            app_metadata: session.user.app_metadata
          } : null
        } : null
      };

      console.log('Frontend auth state:', frontendAuth);

      // Database auth state check
      let databaseAuth: any = {
        authState: null,
        syncResult: null,
        error: null
      };

      try {
        // Check database auth state
        const { data: authStateData, error: authStateError } = await supabase
          .rpc('debug_auth_state');

        if (authStateError) {
          console.error('Auth state check error:', authStateError);
          databaseAuth.error = authStateError.message;
        } else {
          console.log('Database auth state:', authStateData);
          databaseAuth.authState = authStateData;
        }

        // Try to force JWT sync
        const { data: syncData, error: syncError } = await supabase
          .rpc('force_jwt_sync_for_current_user');

        if (syncError) {
          console.error('JWT sync error:', syncError);
          databaseAuth.syncResult = { error: syncError.message };
        } else {
          console.log('JWT sync result:', syncData);
          databaseAuth.syncResult = syncData;
        }

      } catch (dbError: any) {
        console.error('Database auth debug error:', dbError);
        databaseAuth.error = dbError.message;
      }

      const result: AuthDebugResult = {
        frontendAuth,
        databaseAuth,
        timestamp: new Date().toISOString()
      };

      setDebugResult(result);
      console.log('🔍 Auth debug complete:', result);
      
      return result;

    } catch (error: any) {
      console.error('Auth debug failed:', error);
      const errorResult: AuthDebugResult = {
        frontendAuth: {
          isAuthenticated: false,
          userId: null,
          profile: null,
          session: null
        },
        databaseAuth: {
          authState: null,
          syncResult: null,
          error: error.message
        },
        timestamp: new Date().toISOString()
      };
      
      setDebugResult(errorResult);
      return errorResult;
    } finally {
      setIsDebugging(false);
    }
  };

  const forceAuthSync = async () => {
    try {
      console.log('🔄 Forcing auth sync...');
      
      // Force refresh the session
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        return { success: false, error: sessionError.message };
      }

      // Force JWT metadata sync
      const { data: syncData, error: syncError } = await supabase
        .rpc('force_jwt_sync_for_current_user');

      if (syncError) {
        console.error('JWT sync error:', syncError);
        return { success: false, error: syncError.message };
      }

      console.log('🔄 Auth sync complete:', syncData);
      return { success: true, data: syncData };

    } catch (error: any) {
      console.error('Force auth sync failed:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    runAuthDebug,
    forceAuthSync,
    isDebugging,
    debugResult,
    clearDebugResult: () => setDebugResult(null)
  };
};