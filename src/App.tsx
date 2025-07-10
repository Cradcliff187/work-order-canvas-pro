import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWorkOrders from "./pages/admin/AdminWorkOrders";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import SubcontractorDashboard from "./pages/subcontractor/SubcontractorDashboard";
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
            <Route path="/partner/dashboard" element={
              <ProtectedRoute requiredUserType="partner">
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <PartnerDashboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/subcontractor/dashboard" element={
              <ProtectedRoute requiredUserType="subcontractor">
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <SubcontractorDashboard />
                </div>
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
