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
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page while impersonating.</p>
          </div>
        </div>
      );
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
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    } else {
      console.log('ProtectedRoute - Access granted via hierarchy');
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;