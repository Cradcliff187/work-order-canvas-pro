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
  const { user: migrationUser, permissions } = useMigrationContext();

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

  // Use migration bridge for permission checks
  const hasRequiredPermission = () => {
    if (!requiredUserType) return true;
    
    // When impersonating, check real profile permissions but allow admin override
    if (isImpersonating && realProfile?.user_type === 'admin') {
      console.log('ProtectedRoute - Admin impersonating - allowing access');
      return true;
    }
    
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
    
    // Redirect based on effective user type
    const effectiveUserType = migrationUser ? getEffectiveUserType(migrationUser) : 
                              (viewingProfile || profile)?.user_type;
    const redirectPath = effectiveUserType === 'admin' ? '/admin/dashboard' :
                         effectiveUserType === 'partner' ? '/partner/dashboard' :
                         effectiveUserType === 'subcontractor' ? '/subcontractor/dashboard' :
                         effectiveUserType === 'employee' ? '/admin/employee-dashboard' :
                         '/auth';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;