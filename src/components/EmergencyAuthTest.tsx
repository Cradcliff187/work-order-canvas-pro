import React from 'react';
import { useEmergencyAuthContext } from '@/contexts/EmergencyAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const EmergencyAuthTest: React.FC = () => {
  const {
    user,
    profile,
    userOrganizations,
    loading,
    sessionContextWorking,
    usingEmergencyAuth,
    debugInfo,
    signOut,
    refreshProfile
  } = useEmergencyAuthContext();

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Emergency Auth System Test
              <Badge variant={sessionContextWorking ? "default" : "destructive"}>
                {sessionContextWorking ? "Normal" : "Emergency"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Session Status</h3>
                <div className="text-sm space-y-1">
                  <div>User ID: {user?.id || 'None'}</div>
                  <div>Email: {user?.email || 'None'}</div>
                  <div>Session Context Working: {sessionContextWorking ? 'Yes' : 'No'}</div>
                  <div>Using Emergency Auth: {usingEmergencyAuth ? 'Yes' : 'No'}</div>
                  <div>Loading: {loading ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold">Profile Data</h3>
                <div className="text-sm space-y-1">
                  <div>Profile ID: {profile?.id || 'None'}</div>
                  <div>Name: {profile ? `${profile.first_name} ${profile.last_name}` : 'None'}</div>
                  <div>Email: {profile?.email || 'None'}</div>
                  <div>Active: {profile?.is_active ? 'Yes' : 'No'}</div>
                  <div>Employee: {profile?.is_employee ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Organizations ({userOrganizations.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {userOrganizations.length > 0 ? (
                  userOrganizations.map((org, index) => (
                    <div key={index} className="p-2 border rounded text-sm">
                      <div className="font-medium">{org.organization?.name}</div>
                      <div>Type: {org.organization?.organization_type}</div>
                      <div>Role: {org.role}</div>
                      <div>ID: {org.organization_id}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">No organizations found</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Debug Information</h3>
              <div className="text-xs bg-gray-100 p-2 rounded font-mono">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={refreshProfile} variant="outline">
                Refresh Profile
              </Button>
              <Button onClick={signOut} variant="destructive">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};