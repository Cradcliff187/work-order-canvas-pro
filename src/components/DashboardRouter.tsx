import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const DashboardRouter: React.FC = () => {
  const { profile, loading, isImpersonating } = useAuth();

  console.log('DashboardRouter - Profile:', profile);
  console.log('DashboardRouter - Is Impersonating:', isImpersonating);
  console.log('DashboardRouter - User Type:', profile?.user_type);

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

  // Redirect to appropriate dashboard based on user type
  switch (profile.user_type) {
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