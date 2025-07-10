import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import PartnerLayout from "./components/PartnerLayout";
import { SubcontractorLayout } from "./components/SubcontractorLayout";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded page imports
import {
  Auth,
  Dashboard,
  DevTools,
  AdminDashboard,
  AdminUsers,
  AdminOrganizations,
  AdminWorkOrders,
  AdminWorkOrderDetail,
  AdminAnalytics,
  AdminReports,
  AdminReportDetail,
  PartnerDashboard,
  SubmitWorkOrder,
  WorkOrderList,
  WorkOrderDetail,
  PartnerReports,
  PartnerReportDetail,
  SubcontractorDashboard,
  SubcontractorWorkOrders,
  SubcontractorWorkOrderDetail,
  SubmitReport,
  ReportHistory,
  ReportDetail,
} from "./pages/LazyPages";

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth routes - immediate loading */}
            <Route path="/auth" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Auth />
              </Suspense>
            } />
            
            {/* Main dashboard route */}
            <Route path="/" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <Suspense fallback={<LoadingSpinner />}>
                    <Dashboard />
                  </Suspense>
                </div>
              </ProtectedRoute>
            } />

            {/* Admin routes - lazy loaded as group */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminDashboard />
                  </Suspense>
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/work-orders" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminWorkOrders />
                  </Suspense>
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/work-orders/:id" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminWorkOrderDetail />
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
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminAnalytics />
                  </Suspense>
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminReports />
                  </Suspense>
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/reports/:id" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminReportDetail />
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

            {/* Partner routes - lazy loaded as group */}
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

            {/* Subcontractor routes - lazy loaded as group */}
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

            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
