import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanySettingsProvider } from "@/contexts/CompanySettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AdminLayout from "@/components/AdminLayout";
import AgentLayout from "@/components/AgentLayout";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import Invoices from "./pages/Invoices";
import InvoiceReview from "./pages/InvoiceReview";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import RoutesPage from "./pages/Routes";
import RouteManagement from "./pages/RouteManagement";
import RouteAssignment from "./pages/RouteAssignment";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DeliveryAgent from "./pages/DeliveryAgent";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/' : '/agent'} replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Auth Route */}
      <Route 
        path="/auth" 
        element={user && profile ? <Navigate to={profile.role === 'admin' ? '/' : '/agent'} replace /> : <Auth />} 
      />
      
      {/* Admin Routes */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Index /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Orders /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/invoices" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Invoices /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/invoice-review/:orderId" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><InvoiceReview /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Customers /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Products /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/routes" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><RoutesPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/route-management" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><RouteManagement /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/route-assignment" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><RouteAssignment /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Reports /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout><Settings /></AdminLayout>
        </ProtectedRoute>
      } />
      
      {/* Agent Routes */}
      <Route path="/agent" element={
        <ProtectedRoute allowedRoles={['agent']}>
          <AgentLayout><DeliveryAgent /></AgentLayout>
        </ProtectedRoute>
      } />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CompanySettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </CompanySettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
