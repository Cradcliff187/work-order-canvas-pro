import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useMigrationContext } from '@/components/MigrationWrapper';

const DashboardRouter: React.FC = () => {
  const { profile, loading, isImpersonating } = useAuth();

  // Use organization-based routing
  let enhancedPermissions = null;
  try {
    const { enhancedPermissions: perms } = useMigrationContext();
    enhancedPermissions = perms;
  } catch {
    // No migration context available
  }

  console.log('DashboardRouter - Profile:', profile);
  console.log('DashboardRouter - Enhanced Permissions:', enhancedPermissions);
  console.log('DashboardRouter - Is Impersonating:', isImpersonating);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // Route based on organization permissions
  if (enhancedPermissions?.isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (enhancedPermissions?.isEmployee) {
    return <Navigate to="/admin/employee-dashboard" replace />;
  } else if (enhancedPermissions?.isPartner) {
    console.log('DashboardRouter - Redirecting to partner dashboard');
    return <Navigate to="/partner/dashboard" replace />;
  } else if (enhancedPermissions?.isSubcontractor) {
    return <Navigate to="/subcontractor/dashboard" replace />;
  } else {
    // Default fallback for users without organization permissions
    console.log('DashboardRouter - No organization permissions, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
};

export default DashboardRouter;