import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useUserProfile } from '@/hooks/useUserProfile';

const DashboardRouter: React.FC = () => {
  const { profile, loading, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor, primaryRole } = useUserProfile();


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

  // Organization-based routing - no fallbacks, clear paths
  if (isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  } 
  
  if (isEmployee()) {
    return <Navigate to="/employee/dashboard" replace />;
  }
  
  if (isPartner()) {
    return <Navigate to="/partner/dashboard" replace />;
  } 
  
  if (isSubcontractor()) {
    return <Navigate to="/subcontractor/dashboard" replace />;
  }

  // No valid organization membership - redirect to auth
  return <Navigate to="/auth" replace />;
};

export default DashboardRouter;