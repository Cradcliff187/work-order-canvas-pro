import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Bug } from 'lucide-react';
import { useAuthDebugger } from '@/hooks/useAuthDebugger';
import { useToast } from '@/hooks/use-toast';

export const AuthDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { runAuthDebug, forceAuthSync, isDebugging, debugResult } = useAuthDebugger();
  const { toast } = useToast();

  const handleDebug = async () => {
    const result = await runAuthDebug();
    
    if (result.databaseAuth.error) {
      toast({
        title: "Auth Debug Error",
        description: result.databaseAuth.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Auth Debug Complete",
        description: "Check the debug panel for results",
      });
    }
  };

  const handleForceSync = async () => {
    const result = await forceAuthSync();
    
    if (result.success) {
      toast({
        title: "Auth Sync Complete",
        description: "JWT metadata has been synchronized",
      });
      // Run debug again to show updated state
      await runAuthDebug();
    } else {
      toast({
        title: "Auth Sync Failed",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="bg-background border-muted-foreground/20"
        >
          <Bug className="h-4 w-4 mr-2" />
          Auth Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] overflow-y-auto bg-background border rounded-lg shadow-lg z-50">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Auth Debug Panel</CardTitle>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDebug}
              disabled={isDebugging}
              size="sm"
              variant="outline"
            >
              {isDebugging ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Bug className="h-3 w-3 mr-1" />
              )}
              Debug Auth
            </Button>
            <Button
              onClick={handleForceSync}
              disabled={isDebugging}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Force Sync
            </Button>
          </div>
        </CardHeader>
        
        {debugResult && (
          <CardContent className="space-y-4 text-xs">
            {/* Frontend Auth Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">Frontend Auth</h4>
                {debugResult.frontendAuth.isAuthenticated ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div>User ID: {debugResult.frontendAuth.userId || 'null'}</div>
                <div>Profile: {debugResult.frontendAuth.profile ? 'loaded' : 'null'}</div>
                <div>Session: {debugResult.frontendAuth.session ? 'present' : 'null'}</div>
              </div>
            </div>

            {/* Database Auth Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">Database Auth</h4>
                {debugResult.databaseAuth.error ? (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                ) : debugResult.databaseAuth.authState?.auth_uid ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              
              {debugResult.databaseAuth.error ? (
                <Badge variant="destructive" className="text-xs">
                  Error: {debugResult.databaseAuth.error}
                </Badge>
              ) : (
                <div className="space-y-1 text-muted-foreground">
                  <div>
                    auth.uid(): {debugResult.databaseAuth.authState?.auth_uid || 'null'}
                  </div>
                  <div>
                    JWT exists: {debugResult.databaseAuth.authState?.jwt_exists ? 'true' : 'false'}
                  </div>
                  <div>
                    Profile exists: {debugResult.databaseAuth.authState?.profile_exists ? 'true' : 'false'}
                  </div>
                </div>
              )}
            </div>

            {/* JWT Sync Status */}
            {debugResult.databaseAuth.syncResult && (
              <div>
                <h4 className="font-medium mb-2">JWT Sync</h4>
                {debugResult.databaseAuth.syncResult.success ? (
                  <Badge variant="default" className="text-xs">
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Failed: {debugResult.databaseAuth.syncResult.error}
                  </Badge>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              Last updated: {new Date(debugResult.timestamp).toLocaleTimeString()}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};