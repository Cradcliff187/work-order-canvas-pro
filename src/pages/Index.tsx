
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard router
  if (user) {
    return <Navigate to="/" replace />;
  }

  // If not authenticated, redirect to auth page
  return <Navigate to="/auth" replace />;
};

export default Index;
