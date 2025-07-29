import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useMigrationContext } from '@/components/MigrationWrapper';
import { getEffectiveUserType } from '@/lib/migration/dualTypeAuth';

const DashboardRouter: React.FC = () => {
  const { profile, loading, isImpersonating } = useAuth();
  const { user, enhancedPermissions, migrationFlags } = useMigrationContext();

  console.log('DashboardRouter - Profile:', profile);
  console.log('DashboardRouter - Migration User:', user);
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

  // Redirect to appropriate dashboard based on effective user type
  const effectiveUserType = migrationFlags.useOrganizationAuth && enhancedPermissions.user ? 
    enhancedPermissions.getUserType() : 
    (user ? getEffectiveUserType(user) : profile.user_type);
  console.log('DashboardRouter - Effective User Type:', effectiveUserType);
  
  switch (effectiveUserType) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'partner':
      console.log('DashboardRouter - Redirecting to partner dashboard');
      return <Navigate to="/partner/dashboard" replace />;
    case 'subcontractor':
      return <Navigate to="/subcontractor/dashboard" replace />;
    case 'employee':
      return <Navigate to="/admin/employee-dashboard" replace />;
    default:
      console.log('DashboardRouter - Unknown user type, redirecting to auth');
      return <Navigate to="/auth" replace />;
  }
};

export default DashboardRouter;