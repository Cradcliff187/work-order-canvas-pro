import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useMigrationContext } from '@/components/MigrationWrapper';
import { dualPermissionCheck, getEffectiveUserType } from '@/lib/migration/dualTypeAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'admin' | 'partner' | 'subcontractor' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredUserType }) => {
  const { user, profile, realProfile, viewingProfile, loading, isImpersonating } = useAuth();
  const { user: migrationUser, permissions, enhancedPermissions, migrationFlags } = useMigrationContext();

  console.log('ProtectedRoute - Real Profile:', realProfile);
  console.log('ProtectedRoute - Viewing Profile:', viewingProfile);
  console.log('ProtectedRoute - Required Type:', requiredUserType);
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

  // No required user type - allow access
  if (!requiredUserType) {
    return <>{children}</>;
  }

  // Use enhanced permission system when available, fallback to bridge
  const hasRequiredPermission = () => {
    if (!requiredUserType) return true;
    
    // When impersonating, check real profile permissions but allow admin override
    if (isImpersonating && enhancedPermissions.isAdmin) {
      console.log('ProtectedRoute - Admin impersonating - allowing access');
      return true;
    }
    
    // Use enhanced permissions if organization system is enabled
    if (migrationFlags.useOrganizationPermissions && enhancedPermissions.user) {
      switch (requiredUserType) {
        case 'admin':
          return enhancedPermissions.isAdmin;
        case 'employee':
          return enhancedPermissions.isEmployee || enhancedPermissions.isAdmin;
        case 'partner':
          return enhancedPermissions.isPartner || enhancedPermissions.hasInternalAccess;
        case 'subcontractor':
          return enhancedPermissions.isSubcontractor || enhancedPermissions.hasInternalAccess;
        default:
          return false;
      }
    }
    
    // Fallback to bridge permissions
    switch (requiredUserType) {
      case 'admin':
        return permissions.isAdmin;
      case 'employee':
        return permissions.isEmployee || permissions.isAdmin;
      case 'partner':
        return permissions.isPartner || permissions.hasInternalAccess;
      case 'subcontractor':
        return permissions.isSubcontractor || permissions.hasInternalAccess;
      default:
        return false;
    }
  };

  if (!hasRequiredPermission()) {
    console.log('ProtectedRoute - ACCESS DENIED - Insufficient permissions');
    
    // Redirect based on effective user type from organization permissions
    let redirectPath = '/auth';
    if (enhancedPermissions.isAdmin) {
      redirectPath = '/admin/dashboard';
    } else if (enhancedPermissions.isEmployee) {
      redirectPath = '/admin/employee-dashboard';
    } else if (enhancedPermissions.isPartner) {
      redirectPath = '/partner/dashboard';
    } else if (enhancedPermissions.isSubcontractor) {
      redirectPath = '/subcontractor/dashboard';
    }
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;