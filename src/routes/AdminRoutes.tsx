import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LazyWrapper } from '@/components/LazyWrapper';
import { ReceiptUpload } from '@/components/receipts/ReceiptUpload';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  AdminDashboard,
  EmployeeDashboard,
  AdminUsers,
  AdminOrganizations,
  AdminPartnerLocations,
  AdminWorkOrders,
  AdminWorkOrderDetail,
  AdminWorkOrderEdit,
  AdminSubmitReport,
  AdminAnalytics,
  AdminEmailTemplates,
  AdminReports,
  AdminReportDetail,
  AdminProfile,
  AdminEmployees,
  AdminInvoices,
  EmployeeTimeReports,
  EmployeeTimeReport,
  ReceiptHistory,
  SystemHealthCheck,
  TestEmailPage,
  
  AdminUtilities,
  AdminApprovals,
  DevTools,
  
} from '@/pages/LazyPages';

export const AdminRoutes = () => (
  <>
    <Route path="/admin/dashboard" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />

    <Route path="/admin/employee-dashboard" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeDashboard />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/work-orders" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminWorkOrders />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/work-orders/:id" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminWorkOrderDetail />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/work-orders/:id/edit" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminWorkOrderEdit />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/work-orders/:workOrderId/submit-report" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSubmitReport />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/users" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUsers />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/organizations" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminOrganizations />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/partner-locations" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPartnerLocations />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/analytics" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAnalytics />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/email-templates" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminEmailTemplates />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/approvals" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminApprovals />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/reports" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminReports />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/reports/:id" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminReportDetail />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/employees" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminEmployees />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/invoices" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInvoices />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/time-reports" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeTimeReports />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/time-reports/submit/:workOrderId" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <EmployeeTimeReport />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/receipts" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <ReceiptHistory />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/receipts/upload" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <ReceiptUpload />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/profile" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminProfile />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/system-health" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SystemHealthCheck />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/test-email" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <TestEmailPage />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/utilities" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUtilities />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/dev-tools" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <DevTools />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
  </>
);