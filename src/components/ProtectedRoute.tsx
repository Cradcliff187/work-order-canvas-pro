import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'admin' | 'partner' | 'subcontractor' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredUserType }) => {
  const { user, profile, loading, isImpersonating } = useAuth();

  console.log('ProtectedRoute - Profile:', profile);
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

  if (requiredUserType && profile?.user_type !== requiredUserType) {
    console.log('ProtectedRoute - User type mismatch. Profile type:', profile?.user_type, 'Required:', requiredUserType);
    
    // When impersonating, require exact user type match for better UX
    if (isImpersonating) {
      console.log('ProtectedRoute - ACCESS DENIED - Impersonating user must have exact user type match');
      const redirectPath = profile?.user_type === 'admin' ? '/admin/dashboard' :
                           profile?.user_type === 'partner' ? '/partner/dashboard' :
                           profile?.user_type === 'subcontractor' ? '/subcontractor/dashboard' :
                           profile?.user_type === 'employee' ? '/admin/employee-dashboard' :
                           '/auth';
      return <Navigate to={redirectPath} replace />;
    }
    
    // For non-impersonated access, check hierarchy
    const userTypeHierarchy = {
      'admin': 4,
      'employee': 3,
      'partner': 2,
      'subcontractor': 1
    };

    const userLevel = userTypeHierarchy[profile?.user_type || 'subcontractor'];
    const requiredLevel = userTypeHierarchy[requiredUserType];
    
    console.log('ProtectedRoute - User level:', userLevel, 'Required level:', requiredLevel);

    if (userLevel < requiredLevel) {
      console.log('ProtectedRoute - ACCESS DENIED - Insufficient permissions');
      const redirectPath = profile?.user_type === 'admin' ? '/admin/dashboard' :
                           profile?.user_type === 'partner' ? '/partner/dashboard' :
                           profile?.user_type === 'subcontractor' ? '/subcontractor/dashboard' :
                           profile?.user_type === 'employee' ? '/admin/employee-dashboard' :
                           '/auth';
      return <Navigate to={redirectPath} replace />;
    } else {
      console.log('ProtectedRoute - Access granted via hierarchy');
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;