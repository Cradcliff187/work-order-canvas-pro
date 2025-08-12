import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoutes } from './PublicRoutes';
import { AdminRoutes } from './AdminRoutes';
import { PartnerRoutes } from './PartnerRoutes';
import { SubcontractorRoutes } from './SubcontractorRoutes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NotFound from '@/pages/NotFound';
import DirectMessagesPage from '@/pages/messages/DirectMessagesPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useUserProfile } from '@/hooks/useUserProfile';

function RoleMessagesRedirect() {
  const { isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  if (isAdmin() || isEmployee()) return <Navigate to="/admin/messages" replace />;
  if (isPartner()) return <Navigate to="/partner/messages" replace />;
  if (isSubcontractor()) return <Navigate to="/subcontractor/messages" replace />;
  return <Navigate to="/messages" replace />; // fallback
}


export const AppRouter: React.FC = () => (
  <ErrorBoundary>
    <Routes>
      {PublicRoutes()}
      {AdminRoutes()}
      {PartnerRoutes()}
      {SubcontractorRoutes()}
      
      {/* Role-aware messages routes */}
      <Route path="/admin/messages" element={<ProtectedRoute><DirectMessagesPage /></ProtectedRoute>} />
      <Route path="/partner/messages" element={<ProtectedRoute><DirectMessagesPage /></ProtectedRoute>} />
      <Route path="/subcontractor/messages" element={<ProtectedRoute><DirectMessagesPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><RoleMessagesRedirect /></ProtectedRoute>} />
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ErrorBoundary>
);
