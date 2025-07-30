import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmergencyAuth } from '@/hooks/useEmergencyAuth';

export const PhaseDebugger: React.FC = () => {
  const auth = useAuth();
  const emergency = useEmergencyAuth();

  return (
    <div className="fixed top-4 right-4 bg-card border rounded-lg p-4 max-w-md z-50 shadow-lg">
      <h3 className="font-bold text-sm mb-2">🔧 Phase 1 Debug</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Auth Context:</strong>
          <div>Loading: {auth.loading ? '✅' : '❌'}</div>
          <div>Profile: {auth.profile ? '✅' : '❌'}</div>
          <div>User: {auth.user ? '✅' : '❌'}</div>
          <div>Organizations: {auth.userOrganizations?.length || 0}</div>
        </div>
        
        <div>
          <strong>Emergency Auth:</strong>
          <div>Loading: {emergency.loading ? '✅' : '❌'}</div>
          <div>Profile: {emergency.profile ? '✅' : '❌'}</div>
          <div>Organizations: {emergency.organizations?.length || 0}</div>
          <div>Error: {emergency.error || 'None'}</div>
        </div>
        
        {emergency.debugInfo && (
          <div>
            <strong>Debug Info:</strong>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(emergency.debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};