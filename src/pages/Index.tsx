import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      // Redirect based on user type
      switch (profile.user_type) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'partner':
          navigate('/dashboard', { replace: true });
          break;
        case 'subcontractor':
          navigate('/subcontractor/dashboard', { replace: true });
          break;
        case 'employee':
          navigate('/employee/dashboard', { replace: true });
          break;
        default:
          // If user type is unknown, go to login
          navigate('/login', { replace: true });
      }
    } else if (!loading && !user) {
      // If not logged in, go to login
      navigate('/login', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  // Show loading spinner while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Loading WorkOrder Portal...</h2>
        <p className="text-muted-foreground">Please wait while we prepare your dashboard</p>
      </div>
    </div>
  );
};

export default Index; 