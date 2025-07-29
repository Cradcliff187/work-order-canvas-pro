import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'admin' | 'partner' | 'subcontractor' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredUserType }) => {
  const { user, profile, realProfile, viewingProfile, loading, isImpersonating } = useAuth();

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

  // FIXED: When impersonating, use the REAL profile for permission checks
  // This allows admins to maintain their elevated access while viewing as other users
  const profileForPermissionCheck = isImpersonating ? realProfile : profile;

  if (profileForPermissionCheck?.user_type !== requiredUserType) {
    console.log('ProtectedRoute - User type mismatch. Profile type:', profileForPermissionCheck?.user_type, 'Required:', requiredUserType);
    
    // Check hierarchy for permission escalation
    const userTypeHierarchy = {
      'admin': 4,
      'employee': 3,
      'partner': 2,
      'subcontractor': 1
    };

    const userLevel = userTypeHierarchy[profileForPermissionCheck?.user_type || 'subcontractor'];
    const requiredLevel = userTypeHierarchy[requiredUserType];
    
    console.log('ProtectedRoute - User level:', userLevel, 'Required level:', requiredLevel);

    if (userLevel < requiredLevel) {
      console.log('ProtectedRoute - ACCESS DENIED - Insufficient permissions');
      
      // When impersonating, allow admins to stay on restricted pages
      if (isImpersonating && realProfile?.user_type === 'admin') {
        console.log('ProtectedRoute - Admin impersonating - allowing access');
        return <>{children}</>;
      }
      
      // Redirect based on the viewing profile (what they're impersonating as)
      const redirectProfile = viewingProfile || profile;
      const redirectPath = redirectProfile?.user_type === 'admin' ? '/admin/dashboard' :
                           redirectProfile?.user_type === 'partner' ? '/partner/dashboard' :
                           redirectProfile?.user_type === 'subcontractor' ? '/subcontractor/dashboard' :
                           redirectProfile?.user_type === 'employee' ? '/admin/employee-dashboard' :
                           '/auth';
      return <Navigate to={redirectPath} replace />;
    } else {
      console.log('ProtectedRoute - Access granted via hierarchy');
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;