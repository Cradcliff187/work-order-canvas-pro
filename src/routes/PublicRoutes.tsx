import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Auth } from '@/pages/LazyPages';
import DashboardRouter from '@/components/DashboardRouter';
import ResetPassword from '@/pages/ResetPassword';

export const PublicRoutes = () => (
  <>
    {/* Auth routes - immediate loading */}
    <Route path="/auth" element={
      <Suspense fallback={<LoadingSpinner />}>
        <Auth />
      </Suspense>
    } />
    
    {/* Password reset route */}
    <Route path="/reset-password" element={<ResetPassword />} />
    
    {/* Main dashboard route - redirects to appropriate user dashboard */}
    <Route path="/" element={
      <ProtectedRoute>
        <DashboardRouter />
      </ProtectedRoute>
    } />
  </>
);