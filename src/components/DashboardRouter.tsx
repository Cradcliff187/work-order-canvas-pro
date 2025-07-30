import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { userTypeCheckers } from '@/lib/permissions/userUtils';
import { createEnhancedUser } from '@/lib/permissions/userUtils';
import { SessionDebugPanel } from '@/components/SessionDebugPanel';

const DashboardRouter: React.FC = () => {
  const { profile, loading, isImpersonating, userOrganizations } = useAuth();

  // Create enhanced user for permission checking
  const enhancedUser = profile ? createEnhancedUser(profile, userOrganizations) : null;

  console.log('DashboardRouter - Profile:', profile);
  console.log('DashboardRouter - Enhanced User:', enhancedUser);
  console.log('DashboardRouter - Is Impersonating:', isImpersonating);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
        <SessionDebugPanel />
      </div>
    );
  }

  if (!profile || !enhancedUser) {
    return (
      <>
        <Navigate to="/auth" replace />
        <SessionDebugPanel />
      </>
    );
  }

  // Route based on organization permissions
  if (userTypeCheckers.isAdmin(enhancedUser)) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (userTypeCheckers.isEmployee(enhancedUser)) {
    return <Navigate to="/admin/employee-dashboard" replace />;
  } else if (userTypeCheckers.isPartner(enhancedUser)) {
    console.log('DashboardRouter - Redirecting to partner dashboard');
    return <Navigate to="/partner/dashboard" replace />;
  } else if (userTypeCheckers.isSubcontractor(enhancedUser)) {
    return <Navigate to="/subcontractor/dashboard" replace />;
  } else {
    // Default fallback for users without organization permissions
    console.log('DashboardRouter - No organization permissions, redirecting to auth');
    return (
      <>
        <Navigate to="/auth" replace />
        <SessionDebugPanel />
      </>
    );
  }
};

export default DashboardRouter;