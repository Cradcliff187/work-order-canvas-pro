import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SubcontractorLayout } from '@/components/SubcontractorLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  SubcontractorDashboard,
  SubcontractorWorkOrders,
  SubcontractorWorkOrderDetail,
  SubmitReport,
  ReportHistory,
  ReportDetail,
} from '@/pages/LazyPages';

export const SubcontractorRoutes = () => (
  <>
    <Route path="/subcontractor/dashboard" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubcontractorDashboard />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/work-orders" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubcontractorWorkOrders />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/work-orders/:id" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubcontractorWorkOrderDetail />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/reports/new/:workOrderId" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubmitReport />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/reports" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <ReportHistory />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/reports/:id" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <ReportDetail />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
  </>
);