import React, { Suspense, lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  AdminDashboard,
  AdminTimeManagement,
  PipelineDashboard,
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
  AdminSubcontractorBills,
  SystemHealthCheck,
  TestEmailPage,
  AdminUtilities,
  SelectReports,
  PartnerInvoiceDetail,
  PartnerInvoices,
  BillingDashboard,
  SubmitBill,
  SecurityAudit,
  AdminReceipts,
  AdminProjects,
  SmartReceiptFlow
} from '@/pages/LazyPages';
import DirectMessagesPage from '@/pages/messages/DirectMessagesPage';

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

    <Route path="/admin/pipeline-dashboard" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PipelineDashboard />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />

    <Route path="/admin/billing-dashboard" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <BillingDashboard />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    {/* Redirect old time-entry URL to time-management */}
    <Route path="/admin/time-entry" element={<Navigate to="/admin/time-management" replace />} />

    <Route path="/admin/time-management" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTimeManagement />
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
    
    <Route path="/admin/projects" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminProjects />
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
    
    <Route path="/admin/subcontractor-bills" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSubcontractorBills />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/subcontractor-bills/create" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubmitBill />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    {/* Redirect old invoices URL to new subcontractor-bills URL */}
    <Route path="/admin/invoices" element={<Navigate to="/admin/subcontractor-bills" replace />} />
    
    <Route path="/admin/submit-bill" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SubmitBill />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/security-audit" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SecurityAudit />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    
    
    <Route path="/admin/receipts/upload" element={
      <ProtectedRoute requiredUserType="employee">
        <Navigate to="/admin/finance/receipts" replace />
      </ProtectedRoute>
    } />

    <Route path="/admin/receipts" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminReceipts />
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
    
    <Route path="/admin/settings" element={<Navigate to="/admin/profile" replace />} />
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
    
    <Route path="/admin/partner-billing" element={<Navigate to="/admin/partner-billing/invoices" replace />} />
    <Route path="/admin/partner-billing/invoices" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerInvoices />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    <Route path="/admin/partner-billing/select-reports" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <SelectReports />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/partner-billing/invoices/:id" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <PartnerInvoiceDetail />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/finance/receipts" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminReceipts />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/messages" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <DirectMessagesPage />
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
    
    <Route path="/admin/testing" element={
      <ProtectedRoute requiredUserType="admin">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            {React.createElement(lazy(() => import('@/pages/testing/TestingPage')))}
          </Suspense>
        </AdminLayout>
      </ProtectedRoute>
    } />
  </>
);