
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardRouter from "@/components/DashboardRouter";

// Public pages
import Auth from "./pages/Auth";

// Admin pages
import { AdminLayout } from "./components/admin/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminWorkOrders from "./pages/admin/AdminWorkOrders";
import AdminReports from "./pages/admin/AdminReports";
import SystemSettings from "./pages/admin/SystemSettings";
import EmailTemplates from "./pages/admin/EmailTemplates";

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
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="organizations" element={<AdminOrganizations />} />
                    <Route path="work-orders" element={<AdminWorkOrders />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="system-settings" element={<SystemSettings />} />
                    <Route path="email-templates" element={<EmailTemplates />} />
                  </Routes>
                </AdminLayout>
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
