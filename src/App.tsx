import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import BibliotecaCriterios from "./pages/BibliotecaCriterios";
import Empresas from "./pages/Empresas";
import ModelosMestre from "./pages/ModelosMestre";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Ambientes from "./pages/company-admin/Ambientes";
import Usuarios from "./pages/company-admin/Usuarios";

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
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/criterios" element={<ProtectedRoute><BibliotecaCriterios /></ProtectedRoute>} />
            <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
            <Route path="/modelos-mestre" element={<ProtectedRoute><ModelosMestre /></ProtectedRoute>} />
            <Route path="/admin-empresa/ambientes" element={<ProtectedRoute><Ambientes /></ProtectedRoute>} />
            <Route path="/admin-empresa/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
