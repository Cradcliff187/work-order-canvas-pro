import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Auth, Dashboard } from '@/pages/LazyPages';

export const PublicRoutes = () => (
  <>
    {/* Auth routes - immediate loading */}
    <Route path="/auth" element={
      <Suspense fallback={<LoadingSpinner />}>
        <Auth />
      </Suspense>
    } />
    
    {/* Main dashboard route */}
    <Route path="/" element={
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        </div>
      </ProtectedRoute>
    } />
  </>
);