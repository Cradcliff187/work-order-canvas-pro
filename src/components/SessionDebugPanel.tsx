import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';

// Phase 3: Frontend Session Debugging Component
// This component provides real-time debugging of authentication state

export const SessionDebugPanel: React.FC = () => {
  const { session, user, profile, userOrganizations, loading } = useAuth();
  

  const sessionStatus = session ? 'Active' : 'No Session';
  const sessionColor = session ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            🔧 Session Debug
            <Badge className={`${sessionColor} text-white`}>
              {sessionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {/* Session Info */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium">
              Session Info <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-xs space-y-1 mt-1">
              <div>User ID: {user?.id || 'None'}</div>
              <div>Email: {user?.email || 'None'}</div>
              <div>Expires: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'None'}</div>
              <div>Provider: {user?.app_metadata?.provider || 'None'}</div>
            </CollapsibleContent>
          </Collapsible>

          {/* Profile Info */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium">
              Profile Info <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-xs space-y-1 mt-1">
              <div>Profile ID: {profile?.id || 'None'}</div>
              <div>Name: {profile ? `${profile.first_name} ${profile.last_name}` : 'None'}</div>
              <div>Active: {profile?.is_active ? 'Yes' : 'No'}</div>
              <div>Loading: {loading ? 'Yes' : 'No'}</div>
            </CollapsibleContent>
          </Collapsible>

          {/* Organizations */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium">
              Organizations ({userOrganizations.length}) <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-xs space-y-1 mt-1">
              {userOrganizations.length > 0 ? (
                userOrganizations.map((org, index) => (
                  <div key={index} className="p-1 bg-gray-100 rounded">
                    <div className="font-medium">{org.organization?.name}</div>
                    <div>Type: {org.organization?.organization_type}</div>
                    <div>Role: {org.role}</div>
                  </div>
                ))
              ) : (
                <div className="text-red-600">No organizations found</div>
              )}
            </CollapsibleContent>
          </Collapsible>

        </CardContent>
      </Card>
    </div>
  );
};