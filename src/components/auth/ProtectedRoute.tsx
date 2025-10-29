import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();

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
    
    // IFA Admin should access IFA admin routes (/, /criterios, /empresas, /modelos-mestre)
    if (userRole === 'ifa_admin') {
      if (currentPath.startsWith('/admin-empresa')) {
        return <Navigate to="/" replace />;
      }
    }
    
    // Company Admin should access company admin routes (/admin-empresa/*)
    if (userRole === 'company_admin') {
      if (!currentPath.startsWith('/admin-empresa')) {
        return <Navigate to="/admin-empresa" replace />;
      }
    }
  }

  return <>{children}</>;
}
