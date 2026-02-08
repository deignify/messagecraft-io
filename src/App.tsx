import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";

// Pages
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import DashboardHome from "./pages/dashboard/DashboardHome";
import WhatsAppNumbers from "./pages/dashboard/WhatsAppNumbers";
import LiveChat from "./pages/dashboard/LiveChat";
import Contacts from "./pages/dashboard/Contacts";
import Templates from "./pages/dashboard/Templates";
import Automation from "./pages/dashboard/Automation";
import HotelAutomation from "./pages/dashboard/HotelAutomation";
import TeamManagement from "./pages/dashboard/TeamManagement";
import SettingsPage from "./pages/dashboard/Settings";
import NotFound from "./pages/NotFound";

// SuperAdmin Pages
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import UsersManagement from "./pages/superadmin/UsersManagement";
import WhatsAppManagement from "./pages/superadmin/WhatsAppManagement";
import AllConversations from "./pages/superadmin/AllConversations";
import SuperAdminSettings from "./pages/superadmin/SuperAdminSettings";

// Legal & Info Pages
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import AcceptableUse from "./pages/AcceptableUse";
import DataProcessing from "./pages/DataProcessing";
import DataDeletion from "./pages/DataDeletion";
import Contact from "./pages/Contact";
import About from "./pages/About";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WhatsAppProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              {/* Legal & Info Pages */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/acceptable-use" element={<AcceptableUse />} />
              <Route path="/data-processing" element={<DataProcessing />} />
              <Route path="/data-deletion" element={<DataDeletion />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              
              {/* Protected dashboard routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<RoleGuard allowedRoles={['admin', 'manager']}><DashboardHome /></RoleGuard>} />
                <Route path="numbers" element={<RoleGuard allowedRoles={['admin']}><WhatsAppNumbers /></RoleGuard>} />
                <Route path="chat" element={<LiveChat />} />
                <Route path="contacts" element={<RoleGuard allowedRoles={['admin', 'manager']}><Contacts /></RoleGuard>} />
                <Route path="templates" element={<RoleGuard allowedRoles={['admin', 'manager']}><Templates /></RoleGuard>} />
                <Route path="automation" element={<RoleGuard allowedRoles={['admin']}><Automation /></RoleGuard>} />
                <Route path="automation/hotel" element={<RoleGuard allowedRoles={['admin']}><HotelAutomation /></RoleGuard>} />
                <Route path="team" element={<RoleGuard allowedRoles={['admin', 'manager']}><TeamManagement /></RoleGuard>} />
                <Route path="settings" element={<RoleGuard allowedRoles={['admin', 'manager']}><SettingsPage /></RoleGuard>} />
              </Route>

              {/* SuperAdmin routes */}
              <Route path="/superadmin" element={
                <SuperAdminRoute>
                  <SuperAdminLayout />
                </SuperAdminRoute>
              }>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="whatsapp" element={<WhatsAppManagement />} />
                <Route path="conversations" element={<AllConversations />} />
                <Route path="settings" element={<SuperAdminSettings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WhatsAppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
