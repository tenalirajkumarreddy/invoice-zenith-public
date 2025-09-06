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
  // Skip authentication - allow public access
  return <>{children}</>;
}

function AppRoutes() {
  // Skip authentication check - allow public access
  return (
    <Routes>
      {/* Public Routes - No Authentication Required */}
      
      {/* Admin Routes - Now Public */}
      <Route path="/" element={<AdminLayout><Index /></AdminLayout>} />
      <Route path="/auth" element={<AdminLayout><Index /></AdminLayout>} />
      <Route path="/orders" element={<AdminLayout><Orders /></AdminLayout>} />
      <Route path="/invoices" element={<AdminLayout><Invoices /></AdminLayout>} />
      <Route path="/invoice-review/:orderId" element={<AdminLayout><InvoiceReview /></AdminLayout>} />
      <Route path="/customers" element={<AdminLayout><Customers /></AdminLayout>} />
      <Route path="/products" element={<AdminLayout><Products /></AdminLayout>} />
      <Route path="/routes" element={<AdminLayout><RoutesPage /></AdminLayout>} />
      <Route path="/route-management" element={<AdminLayout><RouteManagement /></AdminLayout>} />
      <Route path="/route-assignment" element={<AdminLayout><RouteAssignment /></AdminLayout>} />
      <Route path="/reports" element={<AdminLayout><Reports /></AdminLayout>} />
      <Route path="/settings" element={<AdminLayout><Settings /></AdminLayout>} />
      
      {/* Agent Routes - Now Public */}
      <Route path="/agent" element={<AgentLayout><DeliveryAgent /></AgentLayout>} />
      
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
