
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const DashboardRouter: React.FC = () => {
  const { profile, loading, isImpersonating, impersonatedProfile } = useAuth();

  console.log('=== DashboardRouter Debug ===');
  console.log('DashboardRouter - Real Profile:', profile);
  console.log('DashboardRouter - Impersonated Profile:', impersonatedProfile);
  console.log('DashboardRouter - Is Impersonating:', isImpersonating);

  // Determine the effective user type for routing
  const effectiveProfile = isImpersonating ? impersonatedProfile : profile;
  const effectiveUserType = effectiveProfile?.user_type;

  console.log('DashboardRouter - Effective Profile:', effectiveProfile);
  console.log('DashboardRouter - Effective User Type:', effectiveUserType);

  if (loading) {
    console.log('DashboardRouter - Loading state, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    console.log('DashboardRouter - No profile found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  if (!effectiveProfile || !effectiveUserType) {
    console.log('DashboardRouter - No effective profile or user type, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Route based on effective user type (respecting impersonation)
  const routingDecision = {
    userType: effectiveUserType,
    isImpersonating,
    realUserType: profile?.user_type,
    impersonatedUserType: impersonatedProfile?.user_type
  };

  console.log('DashboardRouter - Routing Decision:', routingDecision);

  // Redirect to appropriate dashboard based on effective user type
  switch (effectiveUserType) {
    case 'admin':
      console.log('DashboardRouter - Redirecting to admin dashboard');
      return <Navigate to="/admin/dashboard" replace />;
    case 'partner':
      console.log('DashboardRouter - Redirecting to partner dashboard');
      return <Navigate to="/partner/dashboard" replace />;
    case 'subcontractor':
      console.log('DashboardRouter - Redirecting to subcontractor dashboard');
      return <Navigate to="/subcontractor/dashboard" replace />;
    case 'employee':
      console.log('DashboardRouter - Redirecting to employee dashboard');
      return <Navigate to="/admin/employee-dashboard" replace />;
    default:
      console.log('DashboardRouter - Unknown effective user type, redirecting to auth:', effectiveUserType);
      return <Navigate to="/auth" replace />;
  }
};

export default DashboardRouter;
