import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
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
  SubcontractorProfile,
  SubmitBill,
  SubcontractorBills,
} from '@/pages/LazyPages';
import SubcontractorSubmitReport from '@/pages/subcontractor/SubcontractorSubmitReport';
import DirectMessagesPage from '@/pages/messages/DirectMessagesPage';

export const SubcontractorRoutes = () => (
  <>
    <Route path="/subcontractor" element={<Navigate to="/subcontractor/dashboard" replace />} />
    
    {/* Legacy route redirects */}
    <Route path="/subcontractor/invoices" element={<Navigate to="/subcontractor/bills" replace />} />
    <Route path="/subcontractor/submit-invoice" element={<Navigate to="/subcontractor/submit-bill" replace />} />
    
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
    
    <Route path="/subcontractor/submit-report" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubcontractorSubmitReport />
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
    
    <Route path="/subcontractor/profile" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubcontractorProfile />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/submit-bill" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubmitBill />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />

    <Route path="/subcontractor/bills" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubcontractorBills />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/subcontractor/messages" element={
      <ProtectedRoute requiredUserType="subcontractor">
        <SubcontractorLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <DirectMessagesPage />
          </Suspense>
        </SubcontractorLayout>
      </ProtectedRoute>
    } />
  </>
);