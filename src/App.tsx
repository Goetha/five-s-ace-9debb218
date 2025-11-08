import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Empresas from "./pages/Empresas";
import Avaliadores from "./pages/Avaliadores";
import ModelosMestre from "./pages/ModelosMestre";
import BibliotecaCriterios from "./pages/BibliotecaCriterios";
import Auditorias from "./pages/Auditorias";
import Ambientes from "./pages/Ambientes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CompanyAdminDashboard from "./pages/company-admin/Dashboard";
import CompanyAdminAmbientes from "./pages/company-admin/Ambientes";
import Ciclos from "./pages/company-admin/Ciclos";
import NovaAuditoria from "./pages/auditor/NovaAuditoria";
import MinhasAuditorias from "./pages/auditor/MinhasAuditorias";
import DetalhesAuditoria from "./pages/auditor/DetalhesAuditoria";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* IFA Admin Routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
            <Route path="/avaliadores" element={<ProtectedRoute><Avaliadores /></ProtectedRoute>} />
            <Route path="/modelos-mestre" element={<ProtectedRoute><ModelosMestre /></ProtectedRoute>} />
            <Route path="/criterios" element={<ProtectedRoute><BibliotecaCriterios /></ProtectedRoute>} />
            <Route path="/auditorias" element={<ProtectedRoute><Auditorias /></ProtectedRoute>} />
            <Route path="/ambientes" element={<ProtectedRoute><Ambientes /></ProtectedRoute>} />
            
            {/* Company Admin Routes */}
            <Route path="/admin-empresa" element={<ProtectedRoute><CompanyAdminDashboard /></ProtectedRoute>} />
            <Route path="/admin-empresa/ambientes" element={<ProtectedRoute><CompanyAdminAmbientes /></ProtectedRoute>} />
            <Route path="/admin-empresa/ciclos" element={<ProtectedRoute><Ciclos /></ProtectedRoute>} />
            
            {/* Auditor Routes */}
            <Route path="/auditor/nova-auditoria" element={<ProtectedRoute><NovaAuditoria /></ProtectedRoute>} />
            <Route path="/auditor/minhas-auditorias" element={<ProtectedRoute><MinhasAuditorias /></ProtectedRoute>} />
            <Route path="/auditor/auditoria/:id" element={<ProtectedRoute><DetalhesAuditoria /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
