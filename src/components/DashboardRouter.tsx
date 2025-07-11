import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const DashboardRouter: React.FC = () => {
  const { profile, loading } = useAuth();

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
      return <Navigate to="/admin" replace />;
    case 'partner':
      return <Navigate to="/partner" replace />;
    case 'subcontractor':
      return <Navigate to="/subcontractor" replace />;
    case 'employee':
      return <Navigate to="/admin/employee" replace />;
    default:
      // Fallback for unknown user types
      return <Navigate to="/auth" replace />;
  }
};

export default DashboardRouter;