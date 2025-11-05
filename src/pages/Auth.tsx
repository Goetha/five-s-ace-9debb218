import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SignInPage, Testimonial } from "@/components/ui/sign-in";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    name: "Carlos Silva",
    handle: "@carlossilva",
    text: "Sistema excelente! A gestão de auditorias 5S nunca foi tão simples e eficiente."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    name: "Ana Paula",
    handle: "@anapaula",
    text: "Interface intuitiva e recursos poderosos. Melhorou muito nosso processo de qualidade."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    name: "Roberto Costa",
    handle: "@robertocosta",
    text: "Plataforma completa para gestão 5S. Recomendo para todas as empresas que buscam excelência."
  },
];

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user, userRole, isLoading: authLoading } = useAuth();

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
    <SignInPage
      title={<span className="font-light text-foreground tracking-tighter">SaaS 5S Manager</span>}
      description="Sistema de gestão de auditorias 5S"
      heroImageSrc="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=2160&q=80"
      testimonials={testimonials}
      onSignIn={handleLogin}
      isLoading={authLoading}
    />
  );
}
