import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'admin' | 'partner' | 'subcontractor' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredUserType }) => {
  const { user, profile, realProfile, viewingProfile, loading, isImpersonating } = useAuth();
  const { isAdmin, isEmployee, isPartner, isSubcontractor, hasPermission } = useUserProfile();

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

  // Check permissions using organization-based system
  const hasRequiredPermission = () => {
    if (!requiredUserType) return true;
    
    // When impersonating, check real profile permissions but allow admin override
    if (isImpersonating && isAdmin()) {
      console.log('ProtectedRoute - Admin impersonating - allowing access');
      return true;
    }
    
    // Use permission checking method
    return hasPermission(requiredUserType);
  };

  if (!hasRequiredPermission()) {
    console.log('ProtectedRoute - ACCESS DENIED - Insufficient permissions');
    
    // Redirect based on user type
    let redirectPath = '/auth';
    if (isAdmin()) {
      redirectPath = '/admin/dashboard';
    } else if (isEmployee()) {
      redirectPath = '/admin/employee-dashboard';
    } else if (isPartner()) {
      redirectPath = '/partner/dashboard';
    } else if (isSubcontractor()) {
      redirectPath = '/subcontractor/dashboard';
    }
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;