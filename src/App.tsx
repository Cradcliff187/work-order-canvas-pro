
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouter from "@/components/DashboardRouter";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Layouts
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import PartnerLayout from "@/components/PartnerLayout";
import { SubcontractorLayout } from "@/components/SubcontractorLayout";

// Public pages
import Auth from "./pages/Auth";

// Lazy-loaded pages
import {
  // Admin pages
  AdminDashboard,
  EmployeeDashboard,
  AdminUsers,
  AdminOrganizations,
  AdminWorkOrders,
  AdminReports,
  AdminEmailTemplates,
  
  // Partner pages
  PartnerDashboard,
  SubmitWorkOrder,
  WorkOrderList,
  WorkOrderDetail,
  PartnerLocations,
  PartnerReports,
  PartnerReportDetail,
  PartnerProfile,
  
  // Subcontractor pages
  SubcontractorDashboard,
  SubcontractorWorkOrders,
  SubcontractorWorkOrderDetail,
  SubmitReport,
  ReportHistory,
  ReportDetail,
  SubcontractorProfile,
  SubmitInvoice,
  SubcontractorInvoices,
} from "@/pages/LazyPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Root route - redirect authenticated users to appropriate dashboard */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } />

            {/* Public auth route */}
            <Route path="/auth" element={<Auth />} />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <Routes>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminDashboard />
                      </Suspense>
                    } />
                    <Route path="employee-dashboard" element={
                      <ProtectedRoute requiredUserType="employee">
                        <Suspense fallback={<LoadingSpinner />}>
                          <EmployeeDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="users" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminUsers />
                      </Suspense>
                    } />
                    <Route path="organizations" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminOrganizations />
                      </Suspense>
                    } />
                    <Route path="work-orders" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminWorkOrders />
                      </Suspense>
                    } />
                    <Route path="reports" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminReports />
                      </Suspense>
                    } />
                    <Route path="email-templates" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminEmailTemplates />
                      </Suspense>
                    } />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Partner routes */}
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

            {/* Subcontractor routes */}
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
            
            <Route path="/subcontractor/profile" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <SubcontractorProfile />
                  </Suspense>
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/subcontractor/submit-invoice" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <SubmitInvoice />
                  </Suspense>
                </SubcontractorLayout>
              </ProtectedRoute>
            } />

            <Route path="/subcontractor/invoices" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <SubcontractorInvoices />
                  </Suspense>
                </SubcontractorLayout>
              </ProtectedRoute>
            } />

            {/* Catch all route - redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
