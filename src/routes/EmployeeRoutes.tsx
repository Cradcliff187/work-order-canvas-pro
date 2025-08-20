import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import EmployeeLayout from '@/components/employee/layout/EmployeeLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  EmployeeDashboardEmployee as EmployeeDashboard,
  EmployeeTimeReportsPage as EmployeeTimeReports,
  EmployeeReceiptsPage as EmployeeReceipts,
} from '@/pages/LazyPages';
import DirectMessagesPage from '@/pages/messages/DirectMessagesPage';
import TimeReportSubmission from '@/pages/employee/TimeReportSubmission';
import AssignmentDetail from '@/pages/employee/AssignmentDetail';

export const EmployeeRoutes = () => (
  <>
    <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
    
    <Route path="/employee/dashboard" element={
      <ProtectedRoute requiredUserType="employee">
        <EmployeeLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeDashboard />
          </Suspense>
        </EmployeeLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/employee/time-reports" element={
      <ProtectedRoute requiredUserType="employee">
        <EmployeeLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeTimeReports />
          </Suspense>
        </EmployeeLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/employee/receipts" element={
      <ProtectedRoute requiredUserType="employee">
        <EmployeeLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeReceipts />
          </Suspense>
        </EmployeeLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/employee/messages" element={
      <ProtectedRoute requiredUserType="employee">
        <EmployeeLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <DirectMessagesPage />
          </Suspense>
        </EmployeeLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/employee/time-reports/submit/:workOrderId" element={
      <ProtectedRoute requiredUserType="employee">
        <EmployeeLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <TimeReportSubmission />
          </Suspense>
        </EmployeeLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/employee/assignments/:id" element={
      <ProtectedRoute requiredUserType="employee">
        <EmployeeLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AssignmentDetail />
          </Suspense>
        </EmployeeLayout>
      </ProtectedRoute>
    } />
  </>
);