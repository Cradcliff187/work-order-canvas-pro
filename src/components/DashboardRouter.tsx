import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useUserProfile } from '@/hooks/useUserProfile';

const DashboardRouter: React.FC = () => {
  const { profile, loading } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();

  console.log('DashboardRouter - Profile:', profile);

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
  if (isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (isEmployee()) {
    return <Navigate to="/admin/employee-dashboard" replace />;
  } else if (isPartner()) {
    console.log('DashboardRouter - Redirecting to partner dashboard');
    return <Navigate to="/partner/dashboard" replace />;
  } else if (isSubcontractor()) {
    return <Navigate to="/subcontractor/dashboard" replace />;
  } else {
    // Default fallback for users without organization permissions
    console.log('DashboardRouter - No organization permissions, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
};

export default DashboardRouter;