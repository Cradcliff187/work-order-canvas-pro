import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicRoutes } from './PublicRoutes';
import { AdminRoutes } from './AdminRoutes';
import { PartnerRoutes } from './PartnerRoutes';
import { SubcontractorRoutes } from './SubcontractorRoutes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MigrationWrapper } from '@/components/MigrationWrapper';
import NotFound from '@/pages/NotFound';

export const AppRouter: React.FC = () => (
  <ErrorBoundary>
    <MigrationWrapper>
      <Routes>
        {PublicRoutes()}
        {AdminRoutes()}
        {PartnerRoutes()}
        {SubcontractorRoutes()}
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MigrationWrapper>
  </ErrorBoundary>
);