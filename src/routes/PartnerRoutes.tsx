
import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import PartnerLayout from '@/components/PartnerLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  PartnerDashboard,
  SubmitWorkOrder,
  WorkOrderList,
  WorkOrderDetail,
  PartnerLocations,
  PartnerReports,
  PartnerReportDetail,
  PartnerProfile,
} from '@/pages/LazyPages';

export const PartnerRoutes = () => (
  <>
    {/* Redirect from /partner to /partner/dashboard */}
    <Route path="/partner" element={<Navigate to="/partner/dashboard" replace />} />
    
    <Route path="/partner/dashboard" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerDashboard />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/work-orders/new" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubmitWorkOrder />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/work-orders" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <WorkOrderList />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/work-orders/:id" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <WorkOrderDetail />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/locations" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerLocations />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/reports" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerReports />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/reports/:id" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerReportDetail />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/partner/profile" element={
      <ProtectedRoute requiredUserType="partner">
        <PartnerLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerProfile />
          </Suspense>
        </PartnerLayout>
      </ProtectedRoute>
    } />
  </>
);
