import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useUserProfile } from '@/hooks/useUserProfile';

const DashboardRouter: React.FC = () => {
  const { profile, loading, userOrganizations } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor, primaryRole } = useUserProfile();

  // DEBUG LOGGING
  console.log('=== DASHBOARD ROUTER DEBUG ===');
  console.log('1. Auth Context State:', {
    loading,
    hasProfile: !!profile,
    profileEmail: profile?.email,
    organizationCount: userOrganizations?.length
  });
  console.log('2. User Role Checks:', {
    isAdmin: isAdmin(),
    isEmployee: isEmployee(),
    isPartner: isPartner(),
    isSubcontractor: isSubcontractor(),
    primaryRole
  });
  console.log('3. Organizations:', userOrganizations);
  // END DEBUG

  console.log('DashboardRouter - Organization memberships:', userOrganizations);
  console.log('DashboardRouter - Primary role:', primaryRole);

  if (loading) {
    console.log('4. Still loading - showing spinner');
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
    console.log('DashboardRouter - Admin access granted');
    return <Navigate to="/admin/dashboard" replace />;
  } 
  
  if (isEmployee()) {
    console.log('DashboardRouter - Employee access granted');
    return <Navigate to="/employee/dashboard" replace />;
  }
  
  if (isPartner()) {
    console.log('DashboardRouter - Partner access granted');
    return <Navigate to="/partner/dashboard" replace />;
  } 
  
  if (isSubcontractor()) {
    console.log('DashboardRouter - Subcontractor access granted');
    return <Navigate to="/subcontractor/dashboard" replace />;
  }

  // No valid organization membership - redirect to auth
  console.log('DashboardRouter - No valid organization membership, redirecting to auth');
  return <Navigate to="/auth" replace />;
};

export default DashboardRouter;