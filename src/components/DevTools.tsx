
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Database, Users, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDevTools } from "@/hooks/useDevTools";
import { useAuth } from "@/contexts/AuthContext";

interface DevToolsResponse {
  success: boolean;
  message: string;
  details?: any;
  users?: any[];
  deleted_counts?: any;
}

export const DevTools = () => {
  const {
    setupSqlData,
    createAuthUsers,
    clearTestData,
    loading,
    setupLoading,
    authLoading,
    counts,
    setupResult,
    authResult,
    sqlResult,
    fetchCounts
  } = useDevTools();
  
  const { user, profile } = useAuth();

  const isAdmin = profile?.user_type === 'admin';

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only administrators can access developer tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderResult = (result: DevToolsResponse | null) => {
    if (!result) return null;

    return (
      <div className={`mt-4 p-4 rounded-lg border ${
        result.success 
          ? 'border-green-200 bg-green-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className={`font-medium ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.message}
          </span>
        </div>
        
        {result.details && (
          <pre className="text-sm text-gray-600 mt-2 overflow-auto">
            {JSON.stringify(result.details, null, 2)}
          </pre>
        )}
        
        {result.users && (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700">Created Users:</p>
            <ul className="text-sm text-gray-600 mt-1">
              {result.users.map((user: any, index: number) => (
                <li key={index} className="flex justify-between">
                  <span>{user.email}</span>
                  <span className="text-gray-500">({user.user_type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {result.deleted_counts && (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700">Deleted Counts:</p>
            <pre className="text-sm text-gray-600 mt-1">
              {JSON.stringify(result.deleted_counts, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          WorkOrderPortal Developer Tools
        </h1>
        <p className="text-muted-foreground mb-6">
          Database management and testing utilities for development environments.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Seeding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Seeding
              </CardTitle>
              <CardDescription>
                Populate database with comprehensive test data for development and testing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={setupSqlData}
                disabled={setupLoading}
                className="w-full"
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up Database...
                  </>
                ) : (
                  'Setup Test Environment'
                )}
              </Button>
              
              <Separator />
              
              <Button 
                onClick={clearTestData}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing Data...
                  </>
                ) : (
                  'Clear Test Data'
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Setup Test Environment:</strong> Creates organizations, work orders, reports, and invoices with realistic test data.</p>
                <p><strong>Clear Test Data:</strong> Safely removes all test data while preserving real admin accounts.</p>
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Create authenticated test users for comprehensive role-based testing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={createAuthUsers}
                disabled={authLoading}
                className="w-full"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Users...
                  </>
                ) : (
                  'Create Test Users'
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Creates authenticated users:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>partner1@workorderportal.test (Partner)</li>
                  <li>sub1@workorderportal.test (Subcontractor)</li>
                  <li>employee1@workorderportal.test (Employee)</li>
                </ul>
                <p className="mt-2"><strong>Password:</strong> TestPass123!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              Current user information and system access status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">User ID:</span>
                <span className="font-mono">{user?.id || 'Not authenticated'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span>{user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">User Type:</span>
                <span className="capitalize">{profile?.user_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Admin Access:</span>
                <span className={isAdmin ? 'text-green-600' : 'text-red-600'}>
                  {isAdmin ? 'Granted' : 'Denied'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Display */}
        {(setupResult || authResult || sqlResult) && (
          <Card>
            <CardHeader>
              <CardTitle>Last Operation Result</CardTitle>
            </CardHeader>
            <CardContent>
              {renderResult(setupResult || authResult || sqlResult)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DevTools;
