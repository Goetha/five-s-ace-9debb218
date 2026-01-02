import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLogin } from "@/components/ui/full-screen-login";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user, userRole, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated based on role
  useEffect(() => {
    if (user && !authLoading && userRole) {
      if (userRole === 'ifa_admin') {
        navigate('/');
      } else if (userRole === 'company_admin') {
        navigate('/admin-empresa');
      } else {
        // Outros roles (auditor, area_manager, viewer)
        navigate('/admin-empresa');
      }
    }
  }, [user, userRole, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message === "Invalid login credentials" 
          ? "Email ou senha incorretos" 
          : error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
        className: "bg-green-50 border-green-200",
      });
      // O redirecionamento será feito pelo useEffect baseado no role
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FullScreenLogin
      onLogin={handleLogin}
      isLoading={isSubmitting}
    />
  );
}
