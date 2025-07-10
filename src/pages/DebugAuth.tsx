import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

interface DebugInfo {
  authUid: string | null;
  userEmail: string | null;
  profileData: any;
  currentUserType: string | null;
  isAdminResult: boolean | null;
  rlsTests: Record<string, any>;
  errors: string[];
}

const DebugAuth = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    authUid: null,
    userEmail: null,
    profileData: null,
    currentUserType: null,
    isAdminResult: null,
    rlsTests: {},
    errors: []
  });
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const runDiagnostics = async () => {
    setLoading(true);
    const info: DebugInfo = {
      authUid: user?.id || null,
      userEmail: user?.email || null,
      profileData: profile,
      currentUserType: null,
      isAdminResult: null,
      rlsTests: {},
      errors: []
    };

    try {
      // Test current user type function
      try {
        const { data: userTypeResult } = await supabase.rpc('get_current_user_type');
        info.currentUserType = userTypeResult;
      } catch (error) {
        info.errors.push(`get_current_user_type failed: ${error.message}`);
      }

      // Test is_admin function
      try {
        const { data: adminResult } = await supabase.rpc('is_admin');
        info.isAdminResult = adminResult;
      } catch (error) {
        info.errors.push(`is_admin failed: ${error.message}`);
      }

      // Test RLS on various tables with individual calls for type safety
      const testTable = async (tableName: string, tableQuery: () => Promise<any>) => {
        try {
          const result = await tableQuery();
          info.rlsTests[tableName] = {
            success: !result.error,
            error: result.error?.message,
            rowCount: result.data?.length || 0
          };
        } catch (error: any) {
          info.rlsTests[tableName] = {
            success: false,
            error: error.message,
            rowCount: 0
          };
        }
      };

      await Promise.all([
        testTable('profiles', async () => await supabase.from('profiles').select('*').limit(1)),
        testTable('organizations', async () => await supabase.from('organizations').select('*').limit(1)),
        testTable('work_orders', async () => await supabase.from('work_orders').select('*').limit(1)),
        testTable('trades', async () => await supabase.from('trades').select('*').limit(1)),
        testTable('user_organizations', async () => await supabase.from('user_organizations').select('*').limit(1)),
        testTable('work_order_reports', async () => await supabase.from('work_order_reports').select('*').limit(1)),
        testTable('work_order_attachments', async () => await supabase.from('work_order_attachments').select('*').limit(1))
      ]);

      // Test direct profile query
      try {
        const { data: directProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single();
        
        info.profileData = { ...info.profileData, directQuery: directProfile, directError: error?.message };
      } catch (error) {
        info.profileData = { ...info.profileData, directError: error.message };
      }

    } catch (error) {
      info.errors.push(`General error: ${error.message}`);
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const fixMyAccess = async () => {
    setFixing(true);
    try {
      // First, ensure the user's profile exists and is set as admin
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          email: user?.email,
          user_type: 'admin',
          first_name: user?.user_metadata?.first_name || 'Admin',
          last_name: user?.user_metadata?.last_name || 'User',
          is_active: true
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        throw new Error(`Failed to update profile: ${upsertError.message}`);
      }

      // Wait a moment for the changes to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh the session to pick up new data
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh warning:', refreshError.message);
      }

      toast({
        title: "Access Fixed!",
        description: "Your admin access has been restored. Please refresh the page.",
      });

      // Re-run diagnostics
      await runDiagnostics();

    } catch (error) {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setFixing(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [user, profile]);

  const StatusIcon = ({ success }: { success: boolean | null }) => {
    if (success === null) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return success ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auth Debug Dashboard</h1>
          <p className="text-muted-foreground">Diagnostic tools for authentication and access control issues</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button 
            onClick={fixMyAccess} 
            disabled={fixing || !user}
            className="bg-primary hover:bg-primary/90"
          >
            {fixing ? "Fixing..." : "Fix My Access"}
          </Button>
        </div>
      </div>

      {/* Current Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Session</CardTitle>
          <CardDescription>Authentication session details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Auth UID</label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                <span className="flex-1">{debugInfo.authUid || 'null'}</span>
                {debugInfo.authUid && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => copyToClipboard(debugInfo.authUid!, 'Auth UID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                <span className="flex-1">{debugInfo.userEmail || 'null'}</span>
                {debugInfo.userEmail && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => copyToClipboard(debugInfo.userEmail!, 'Email')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Data */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Data</CardTitle>
          <CardDescription>User profile information from the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Context Profile (from AuthContext)</label>
              <pre className="p-3 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
            {debugInfo.profileData?.directQuery && (
              <div>
                <label className="text-sm font-medium">Direct Query Result</label>
                <pre className="p-3 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(debugInfo.profileData.directQuery, null, 2)}
                </pre>
              </div>
            )}
            {debugInfo.profileData?.directError && (
              <div>
                <label className="text-sm font-medium text-destructive">Direct Query Error</label>
                <div className="p-3 bg-destructive/10 rounded text-sm text-destructive">
                  {debugInfo.profileData.directError}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Function Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Database Function Tests</CardTitle>
          <CardDescription>Results of calling Supabase RPC functions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon success={debugInfo.currentUserType !== null} />
                <label className="text-sm font-medium">get_current_user_type()</label>
              </div>
              <div className="p-2 bg-muted rounded font-mono text-sm">
                {debugInfo.currentUserType || 'null'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusIcon success={debugInfo.isAdminResult !== null} />
                <label className="text-sm font-medium">is_admin()</label>
              </div>
              <div className="p-2 bg-muted rounded font-mono text-sm">
                {debugInfo.isAdminResult?.toString() || 'null'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RLS Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Row Level Security Tests</CardTitle>
          <CardDescription>Testing access to different tables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(debugInfo.rlsTests).map(([table, result]) => (
              <div key={table}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon success={result.success} />
                  <label className="text-sm font-medium capitalize">{table}</label>
                </div>
                <div className="p-2 bg-muted rounded text-xs">
                  {result.success ? (
                    <span className="text-success">✓ {result.rowCount} rows accessible</span>
                  ) : (
                    <span className="text-destructive">✗ {result.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {debugInfo.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Errors Detected</CardTitle>
            <CardDescription>Issues found during diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debugInfo.errors.map((error, index) => (
                <div key={index} className="p-3 bg-destructive/10 rounded text-sm text-destructive">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Suggested actions based on diagnostic results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!debugInfo.authUid && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm">No authenticated user found. Please log in.</span>
              </div>
            )}
            {debugInfo.authUid && !profile && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm">Profile not found in context. This may indicate RLS issues.</span>
              </div>
            )}
            {debugInfo.currentUserType !== 'admin' && debugInfo.userEmail === 'cradcliff@austinkunzconstruction.com' && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm">Admin user not recognized. Use "Fix My Access" button.</span>
              </div>
            )}
            {debugInfo.isAdminResult === false && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm">is_admin() returns false. Check user_type in profile.</span>
              </div>
            )}
            {Object.values(debugInfo.rlsTests).some(test => !test.success) && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm">Some RLS policies are blocking access. Check error messages above.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugAuth;