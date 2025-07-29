import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const DashboardRouter: React.FC = () => {
  const { profile, loading, isImpersonating, permissions, organizationMember } = useAuth();

  console.log('DashboardRouter - Profile:', profile);
  console.log('DashboardRouter - Organization Member:', organizationMember);
  console.log('DashboardRouter - Permissions:', permissions);
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

  // Route based on organization type and role
  if (permissions.isInternal) {
    // For internal organization members, check their role
    if (permissions.hasInternalRole(['employee']) && !permissions.hasInternalRole(['admin', 'owner', 'manager'])) {
      // Pure employee role (not admin/manager) goes to employee dashboard
      console.log('DashboardRouter - Redirecting to employee dashboard');
      return <Navigate to="/admin/employee-dashboard" replace />;
    } else {
      // Admin, owner, or manager goes to main admin dashboard
      console.log('DashboardRouter - Redirecting to admin dashboard');
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  if (permissions.isPartner) {
    console.log('DashboardRouter - Redirecting to partner dashboard');
    return <Navigate to="/partner/dashboard" replace />;
  }

  if (permissions.isSubcontractor) {
    console.log('DashboardRouter - Redirecting to subcontractor dashboard');
    return <Navigate to="/subcontractor/dashboard" replace />;
  }

  // No organization membership - shouldn't happen in production
  console.log('DashboardRouter - No organization membership found, redirecting to auth');
  console.warn('User has profile but no organization membership:', {
    profileId: profile.id,
    userId: profile.user_id,
    organizationType: permissions.organizationType,
    organizationRole: permissions.organizationRole
  });
  
  return <Navigate to="/auth" replace />;
};

export default DashboardRouter;