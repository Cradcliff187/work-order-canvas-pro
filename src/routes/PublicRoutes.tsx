
import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardRouter from '@/components/DashboardRouter';
import Auth from '@/pages/Auth';

export const PublicRoutes = () => (
  <>
    {/* Root route - redirect authenticated users to appropriate dashboard */}
    <Route path="/" element={
      <ProtectedRoute>
        <DashboardRouter />
      </ProtectedRoute>
    } />

    {/* Public auth route */}
    <Route path="/auth" element={<Auth />} />
  </>
);
