import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  AdminDashboard,
  AdminUsers,
  AdminOrganizations,
  AdminWorkOrders,
  AdminWorkOrderDetail,
  AdminWorkOrderEdit,
  AdminAnalytics,
  AdminEmailTemplates,
  AdminReports,
  AdminReportDetail,
  AdminProfile,
  AdminEmployees,
  SystemHealthCheck,
  DevTools,
} from '@/pages/LazyPages';

export const AdminRoutes = () => (
  <>
    <Route path="/admin/dashboard" element={
      <ProtectedRoute requiredUserType="employee">
        <AdminLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
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