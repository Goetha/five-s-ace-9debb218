import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();
  
  // Debug (non-sensitive): track route + role to diagnose redirects
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute]', { path: location.pathname, role: userRole });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based routing
  if (userRole) {
    const currentPath = location.pathname;
    
    // IFA Admin can access: /, /empresas, /avaliadores, /modelos-mestre, /criterios, /auditorias
    // Block access to company admin and auditor routes (except audit details viewing)
    if (userRole === 'ifa_admin') {
      const isAuditorArea = currentPath === '/auditor' || 
                           (currentPath.startsWith('/auditor/') && !currentPath.startsWith('/auditor/auditoria/'));
      if (currentPath.startsWith('/admin-empresa') || isAuditorArea) {
        return <Navigate to="/" replace />;
      }
    }
    
    // Company Admin can access both company admin routes (/admin-empresa/*) and auditor routes (/auditor/*)
    if (userRole === 'company_admin') {
      if (!currentPath.startsWith('/admin-empresa') && !currentPath.startsWith('/auditor')) {
        return <Navigate to="/admin-empresa" replace />;
      }
    }
    
    // Auditor can only access auditor routes (/auditor/*)
    if (userRole === 'auditor') {
      if (!currentPath.startsWith('/auditor')) {
        return <Navigate to="/auditor/minhas-auditorias" replace />;
      }
    }
  }

  return <>{children}</>;
}
