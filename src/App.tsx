import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import PartnerLayout from "./components/PartnerLayout";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWorkOrders from "./pages/admin/AdminWorkOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import SubmitWorkOrder from "./pages/partner/SubmitWorkOrder";
import WorkOrderList from "./pages/partner/WorkOrderList";
import WorkOrderDetail from "./pages/partner/WorkOrderDetail";
import SubcontractorDashboard from "./pages/subcontractor/SubcontractorDashboard";
import { SubcontractorLayout } from "./components/SubcontractorLayout";
import SubcontractorWorkOrders from "./pages/subcontractor/SubcontractorWorkOrders";
import SubcontractorWorkOrderDetail from "./pages/subcontractor/SubcontractorWorkOrderDetail";
import SubmitReport from "./pages/subcontractor/SubmitReport";
import ReportHistory from "./pages/subcontractor/ReportHistory";
import ReportDetail from "./pages/subcontractor/ReportDetail";
import DevTools from "./pages/DevTools";
import DebugAuth from "./pages/DebugAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/debug-auth" element={<DebugAuth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <Dashboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/work-orders" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <AdminWorkOrders />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/organizations" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <AdminOrganizations />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/partner/dashboard" element={
              <ProtectedRoute requiredUserType="partner">
                <PartnerLayout>
                  <PartnerDashboard />
                </PartnerLayout>
              </ProtectedRoute>
            } />
            <Route path="/partner/work-orders/new" element={
              <ProtectedRoute requiredUserType="partner">
                <PartnerLayout>
                  <SubmitWorkOrder />
                </PartnerLayout>
              </ProtectedRoute>
            } />
            <Route path="/partner/work-orders" element={
              <ProtectedRoute requiredUserType="partner">
                <PartnerLayout>
                  <WorkOrderList />
                </PartnerLayout>
              </ProtectedRoute>
            } />
            <Route path="/partner/work-orders/:id" element={
              <ProtectedRoute requiredUserType="partner">
                <PartnerLayout>
                  <WorkOrderDetail />
                </PartnerLayout>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/dashboard" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <SubcontractorDashboard />
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/work-orders" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <SubcontractorWorkOrders />
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/work-orders/:id" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <SubcontractorWorkOrderDetail />
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/reports/new/:workOrderId" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <SubmitReport />
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/reports" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <ReportHistory />
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/reports/:id" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <SubcontractorLayout>
                  <ReportDetail />
                </SubcontractorLayout>
              </ProtectedRoute>
            } />
            <Route path="/dev-tools" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminLayout>
                  <DevTools />
                </AdminLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
