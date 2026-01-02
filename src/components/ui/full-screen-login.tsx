"use client";

import { SunIcon as Sunburst, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface FullScreenLoginProps {
  onLogin?: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}

export const FullScreenLogin = ({ onLogin, isLoading = false }: FullScreenLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value: string) => {
    return value.length >= 6;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let valid = true;

    if (!validateEmail(email)) {
      setEmailError("Por favor, insira um email válido.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!validatePassword(password)) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.");
      valid = false;
    } else {
      setPasswordError("");
    }

    setSubmitted(true);

    if (valid && onLogin) {
      onLogin(e);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute bottom-40 right-20 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-orange-300/30 blur-lg" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <Sunburst className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">5S Manager</span>
          </div>

          <div className="space-y-6">
            <p className="text-4xl xl:text-5xl font-light text-white leading-tight max-w-md">
              Sistema de gestão de auditorias 5S
            </p>
            <p className="text-white/80 text-lg max-w-sm">
              Gerencie critérios, modelos e empresas de forma eficiente e organizada.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white/50 flex items-center justify-center text-white font-medium text-sm">
                IFA
              </div>
            </div>
            <p className="text-white/80 text-sm">
              Plataforma para gestores e auditores
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl">
              <Sunburst className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">5S Manager</span>
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Entrar
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta — Faça login para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Seu email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                className={`text-sm w-full py-3 px-4 border rounded-xl focus:outline-none focus:ring-2 bg-background text-foreground focus:ring-orange-500 transition-all ${
                  emailError ? "border-destructive ring-1 ring-destructive" : "border-border"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby="email-error"
                disabled={isLoading}
              />
              {emailError && (
                <p id="email-error" className="text-destructive text-xs mt-1">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Sua senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`text-sm w-full py-3 px-4 pr-12 border rounded-xl focus:outline-none focus:ring-2 bg-background text-foreground focus:ring-orange-500 transition-all ${
                    passwordError ? "border-destructive ring-1 ring-destructive" : "border-border"
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!passwordError}
                  aria-describedby="password-error"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-destructive text-xs mt-1">
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Ao continuar, você concorda com nossos{" "}
            <span className="text-orange-500 hover:underline cursor-pointer">
              Termos de Serviço
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
