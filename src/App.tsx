
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminWorkOrders from "./pages/admin/AdminWorkOrders";
import AdminReports from "./pages/admin/AdminReports";
import AdminTrades from "./pages/admin/AdminTrades";
import AdminPartnerLocations from "./pages/admin/AdminPartnerLocations";
import SystemSettings from "./pages/admin/SystemSettings";
import EmailTemplates from "./pages/admin/EmailTemplates";

// Partner pages
import PartnerLayout from "./pages/partner/PartnerLayout";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerWorkOrders from "./pages/partner/PartnerWorkOrders";
import PartnerLocations from "./pages/partner/PartnerLocations";

// Subcontractor pages
import SubcontractorLayout from "./pages/subcontractor/SubcontractorLayout";
import SubcontractorDashboard from "./pages/subcontractor/SubcontractorDashboard";
import SubcontractorWorkOrders from "./pages/subcontractor/SubcontractorWorkOrders";
import SubcontractorReports from "./pages/subcontractor/SubcontractorReports";
import SubcontractorInvoices from "./pages/subcontractor/SubcontractorInvoices";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedUserTypes={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="organizations" element={<AdminOrganizations />} />
              <Route path="work-orders" element={<AdminWorkOrders />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="trades" element={<AdminTrades />} />
              <Route path="partner-locations" element={<AdminPartnerLocations />} />
              <Route path="system-settings" element={<SystemSettings />} />
              <Route path="email-templates" element={<EmailTemplates />} />
            </Route>

            {/* Partner routes */}
            <Route path="/partner" element={
              <ProtectedRoute allowedUserTypes={['partner']}>
                <PartnerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/partner/dashboard" replace />} />
              <Route path="dashboard" element={<PartnerDashboard />} />
              <Route path="work-orders" element={<PartnerWorkOrders />} />
              <Route path="locations" element={<PartnerLocations />} />
            </Route>

            {/* Subcontractor routes */}
            <Route path="/subcontractor" element={
              <ProtectedRoute allowedUserTypes={['subcontractor']}>
                <SubcontractorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/subcontractor/dashboard" replace />} />
              <Route path="dashboard" element={<SubcontractorDashboard />} />
              <Route path="work-orders" element={<SubcontractorWorkOrders />} />
              <Route path="reports" element={<SubcontractorReports />} />
              <Route path="invoices" element={<SubcontractorInvoices />} />
            </Route>

            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
