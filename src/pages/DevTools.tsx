import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Trash2, 
  Users, 
  LogIn, 
  Copy,
  Building2,
  FileText,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { useDevTools } from '@/hooks/useDevTools';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DevTools = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    loading,
    counts,
    fetchCounts,
    runSeedScript,
    clearTestData,
    quickLogin,
    testCredentials
  } = useDevTools();

  // Check if we're in development
  const isDevelopment = import.meta.env.MODE === 'development';
  const isAdmin = profile?.user_type === 'admin';

  useEffect(() => {
    if (isDevelopment && isAdmin) {
      fetchCounts();
    }
  }, [isDevelopment, isAdmin]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (!isDevelopment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Development Tools Unavailable</h2>
              <p className="text-muted-foreground">
                Development tools are only available in development environment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                Development tools require admin privileges.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Development Tools</h1>
        <Badge variant="secondary">DEV MODE</Badge>
      </div>

      {/* Database Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Operations
          </CardTitle>
          <CardDescription>
            Manage test data and database seeding operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runSeedScript} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              {loading ? 'Seeding...' : 'Seed Database'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Test Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Test Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all seeded test data including users, organizations, 
                    work orders, and reports. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={clearTestData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              variant="outline" 
              onClick={fetchCounts}
              disabled={loading}
            >
              Refresh Counts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>
            Current record counts for all tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {counts ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(counts).map(([table, count]) => (
                <div key={table} className="text-center">
                  <div className="text-2xl font-bold text-primary">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {table.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Click "Refresh Counts" to load statistics
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test User Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Test User Credentials
          </CardTitle>
          <CardDescription>
            Quick access to test user accounts (password: Test123!)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Admin Users */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="secondary">Admin</Badge>
              </h4>
              <div className="grid gap-2">
                {testCredentials.filter(cred => cred.email.includes('admin')).map((cred) => (
                  <div key={cred.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{cred.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => quickLogin(cred.email)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Partner Users */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="secondary">Partner</Badge>
              </h4>
              <div className="grid gap-2">
                {testCredentials.filter(cred => cred.email.includes('partner')).map((cred) => (
                  <div key={cred.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{cred.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => quickLogin(cred.email)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Subcontractor Users */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="secondary">Subcontractor</Badge>
              </h4>
              <div className="grid gap-2">
                {testCredentials.filter(cred => 
                  !cred.email.includes('admin') && !cred.email.includes('partner')
                ).map((cred) => (
                  <div key={cred.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{cred.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => quickLogin(cred.email)}
                        className="flex items-center gap-1"
                      >
                        <LogIn className="h-3 w-3" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevTools;