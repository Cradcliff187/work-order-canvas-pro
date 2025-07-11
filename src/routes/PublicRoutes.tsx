import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Auth } from '@/pages/LazyPages';
import DashboardRouter from '@/components/DashboardRouter';

export const PublicRoutes = () => (
  <>
    {/* Auth routes - immediate loading */}
    <Route path="/auth" element={
      <Suspense fallback={<LoadingSpinner />}>
        <Auth />
      </Suspense>
    } />
    
    {/* Main dashboard route - redirects to appropriate user dashboard */}
    <Route path="/" element={
      <ProtectedRoute>
        <DashboardRouter />
      </ProtectedRoute>
    } />
  </>
);