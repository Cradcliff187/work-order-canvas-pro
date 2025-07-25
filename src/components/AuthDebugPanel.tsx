import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const AuthDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user, session, profile } = useAuth();
  const { toast } = useToast();

  const runAuthDebug = async () => {
    setLoading(true);
    try {
      // Test 1: Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Test 2: Debug auth state on server
      const { data: debugData, error: debugError } = await supabase.rpc('debug_auth_state');
      
      // Test 3: Force JWT sync
      const { data: syncData, error: syncError } = await supabase.rpc('force_jwt_sync_for_current_user');
      
      setDebugInfo({
        frontend: {
          hasUser: !!user,
          hasSession: !!session,
          hasProfile: !!profile,
          userId: user?.id,
          sessionExpiry: session?.expires_at,
          profileType: profile?.user_type,
          sessionData,
          sessionError: sessionError?.message
        },
        backend: {
          debugData,
          debugError: debugError?.message,
          syncData,
          syncError: syncError?.message
        }
      });
      
      toast({
        title: "Debug Complete",
        description: "Check the debug panel for results"
      });
    } catch (error) {
      console.error('Auth debug error:', error);
      toast({
        title: "Debug Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const forceTokenRefresh = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      toast({
        title: "Token Refreshed",
        description: "Session token has been refreshed"
      });
      
      // Re-run debug after refresh
      setTimeout(runAuthDebug, 1000);
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const triggerJWTSync = async () => {
    try {
      const { data, error } = await supabase.rpc('force_jwt_sync_for_current_user');
      if (error) throw error;
      
      toast({
        title: "JWT Sync Complete",
        description: (data as any)?.success ? "Metadata synced successfully" : "Sync failed"
      });
    } catch (error) {
      toast({
        title: "JWT Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800">🚨 Authentication Debug Panel (TEMPORARY)</CardTitle>
        <div className="flex gap-2">
          <Button onClick={runAuthDebug} disabled={loading} size="sm">
            {loading ? "Running..." : "Run Full Debug"}
          </Button>
          <Button onClick={forceTokenRefresh} variant="outline" size="sm">
            Refresh Token
          </Button>
          <Button onClick={triggerJWTSync} variant="outline" size="sm">
            Sync JWT
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {debugInfo && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Frontend State</h3>
              <div className="grid grid-cols-2 gap-2">
                <Badge variant={debugInfo.frontend.hasUser ? "default" : "destructive"}>
                  User: {debugInfo.frontend.hasUser ? "✓" : "✗"}
                </Badge>
                <Badge variant={debugInfo.frontend.hasSession ? "default" : "destructive"}>
                  Session: {debugInfo.frontend.hasSession ? "✓" : "✗"}
                </Badge>
                <Badge variant={debugInfo.frontend.hasProfile ? "default" : "destructive"}>
                  Profile: {debugInfo.frontend.hasProfile ? "✓" : "✗"}
                </Badge>
                <Badge variant={debugInfo.frontend.profileType ? "default" : "destructive"}>
                  Type: {debugInfo.frontend.profileType || "None"}
                </Badge>
              </div>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugInfo.frontend, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Backend Auth State</h3>
              <Badge variant={debugInfo.backend.debugData?.auth_uid ? "default" : "destructive"}>
                auth.uid(): {debugInfo.backend.debugData?.auth_uid || "null"}
              </Badge>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugInfo.backend, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};