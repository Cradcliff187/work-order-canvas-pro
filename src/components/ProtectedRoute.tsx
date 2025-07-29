import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { OrganizationType, OrganizationRole } from '@/types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Legacy prop for backward compatibility
  requiredUserType?: 'admin' | 'partner' | 'subcontractor' | 'employee';
  // New organization-based props
  requiredOrgType?: OrganizationType;
  requiredRoles?: OrganizationRole[];
  requireInternal?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType,
  requiredOrgType,
  requiredRoles,
  requireInternal
}) => {
  const { 
    user, 
    profile, 
    realProfile, 
    viewingProfile, 
    loading, 
    isImpersonating,
    permissions,
    organizationMember
  } = useAuth();

  console.log('ProtectedRoute - Real Profile:', realProfile);
  console.log('ProtectedRoute - Viewing Profile:', viewingProfile);
  console.log('ProtectedRoute - Organization Member:', organizationMember);
  console.log('ProtectedRoute - Permissions:', permissions);
  console.log('ProtectedRoute - Required User Type (legacy):', requiredUserType);
  console.log('ProtectedRoute - Required Org Type:', requiredOrgType);
  console.log('ProtectedRoute - Required Roles:', requiredRoles);
  console.log('ProtectedRoute - Is Impersonating:', isImpersonating);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No requirements - allow access
  if (!requiredUserType && !requiredOrgType && !requiredRoles && !requireInternal) {
    return <>{children}</>;
  }

  // When impersonating, admins maintain their access
  if (isImpersonating && permissions.hasInternalRole(['admin', 'owner'])) {
    console.log('ProtectedRoute - Admin impersonating - allowing access');
    return <>{children}</>;
  }

  // Handle new organization-based requirements
  if (requiredOrgType || requiredRoles || requireInternal) {
    let hasAccess = true;

    // Check organization type requirement
    if (requiredOrgType && !permissions.isOrganizationType(requiredOrgType)) {
      hasAccess = false;
      console.log('ProtectedRoute - Organization type mismatch. Required:', requiredOrgType, 'Actual:', permissions.organizationType);
    }

    // Check internal requirement
    if (requireInternal && !permissions.isInternal) {
      hasAccess = false;
      console.log('ProtectedRoute - Internal access required but user is not internal');
    }

    // Check role requirements (only for internal users)
    if (requiredRoles && requiredRoles.length > 0) {
      if (!permissions.hasInternalRole(requiredRoles)) {
        hasAccess = false;
        console.log('ProtectedRoute - Role mismatch. Required:', requiredRoles, 'Actual:', permissions.organizationRole);
      }
    }

    if (!hasAccess) {
      console.log('ProtectedRoute - ACCESS DENIED - Organization/Role requirements not met');
      return <Navigate to={getRedirectPath(permissions)} replace />;
    }
  }

  // Handle legacy requiredUserType for backward compatibility
  if (requiredUserType) {
    const hasLegacyAccess = checkLegacyAccess(requiredUserType, permissions);
    
    if (!hasLegacyAccess) {
      console.log('ProtectedRoute - ACCESS DENIED - Legacy user type requirements not met');
      return <Navigate to={getRedirectPath(permissions)} replace />;
    }
  }

  console.log('ProtectedRoute - Access granted');
  return <>{children}</>;
};

// Helper function to check legacy user type access
function checkLegacyAccess(
  requiredUserType: 'admin' | 'partner' | 'subcontractor' | 'employee',
  permissions: any
): boolean {
  switch (requiredUserType) {
    case 'admin':
      // Admin access requires internal org with admin/owner role
      return permissions.isInternal && permissions.hasInternalRole(['admin', 'owner']);
    
    case 'employee':
      // Employee access requires internal org with any role
      return permissions.isInternal;
    
    case 'partner':
      // Partner access requires partner org type
      return permissions.isPartner;
    
    case 'subcontractor':
      // Subcontractor access requires subcontractor org type
      return permissions.isSubcontractor;
    
    default:
      return false;
  }
}

// Helper function to determine redirect path based on permissions
function getRedirectPath(permissions: any): string {
  if (permissions.isInternal) {
    // Internal users go to appropriate dashboard
    if (permissions.hasInternalRole(['employee']) && !permissions.hasInternalRole(['admin', 'owner', 'manager'])) {
      return '/admin/employee-dashboard';
    }
    return '/admin/dashboard';
  }
  
  if (permissions.isPartner) {
    return '/partner/dashboard';
  }
  
  if (permissions.isSubcontractor) {
    return '/subcontractor/dashboard';
  }
  
  // Default to auth page if no organization
  return '/auth';
}

export default ProtectedRoute;